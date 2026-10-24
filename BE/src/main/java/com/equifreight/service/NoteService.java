package com.equifreight.service;

import com.equifreight.configuration.BusinessTime;
import com.equifreight.entity.ChecklistItem;
import com.equifreight.entity.Club;
import com.equifreight.entity.Note;
import com.equifreight.entity.NoteReply;
import com.equifreight.entity.Role;
import com.equifreight.entity.StoredFile;
import com.equifreight.entity.TransportJob;
import com.equifreight.entity.TransportRequest;
import com.equifreight.entity.User;
import com.equifreight.entity.enums.NoteStatus;
import com.equifreight.entity.enums.NotificationKind;
import com.equifreight.entity.enums.RoleName;
import com.equifreight.exception.ResourceNotFoundException;
import com.equifreight.model.note.CreateCustomerNoteRequest;
import com.equifreight.model.note.CreateNoteReplyRequest;
import com.equifreight.model.note.NoteReplyResponse;
import com.equifreight.model.note.NoteResponse;
import com.equifreight.repository.ChecklistItemRepository;
import com.equifreight.repository.NoteReplyRepository;
import com.equifreight.repository.NoteRepository;
import com.equifreight.repository.TransportJobRepository;
import com.equifreight.repository.TransportRequestRepository;
import com.equifreight.service.notification.Audience;
import com.equifreight.service.notification.Subject;
import java.time.Clock;
import java.time.DayOfWeek;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Customer notes (US-00-08): a question attached to a request or job and a topic, never a free chat. The topic
 * routes the note to the role that answers it, staff reply in a thread under it, and each side is told.
 */
@Service
public class NoteService {

    private static final int SUBJECT_MAX = 160;

    private final NoteRepository noteRepository;
    private final NoteReplyRepository noteReplyRepository;
    private final ChecklistItemRepository checklistItemRepository;
    private final TransportRequestRepository requestRepository;
    private final TransportJobRepository jobRepository;
    private final ClubService clubService;
    private final FileService fileService;
    private final NotificationService notificationService;
    private final AuditService auditService;
    private final Clock clock;

    public NoteService(
            NoteRepository noteRepository,
            NoteReplyRepository noteReplyRepository,
            ChecklistItemRepository checklistItemRepository,
            TransportRequestRepository requestRepository,
            TransportJobRepository jobRepository,
            ClubService clubService,
            FileService fileService,
            NotificationService notificationService,
            AuditService auditService,
            Clock clock) {
        this.noteRepository = noteRepository;
        this.noteReplyRepository = noteReplyRepository;
        this.checklistItemRepository = checklistItemRepository;
        this.requestRepository = requestRepository;
        this.jobRepository = jobRepository;
        this.clubService = clubService;
        this.fileService = fileService;
        this.notificationService = notificationService;
        this.auditService = auditService;
        this.clock = clock;
    }

    /** The notes routed to the signed-in staff member's roles; the logistics manager reads every note. */
    @Transactional(readOnly = true)
    public List<NoteResponse> listNotesForStaff(User user) {
        Set<String> roles = roleNames(user);
        List<Note> notes = roles.contains(RoleName.LOGISTICS_MANAGER)
                ? noteRepository.findAllWithDetails()
                : noteRepository.findByRoutedRolesWithDetails(roles);
        return notes.stream().map(this::toResponse).toList();
    }

    /** One note with its replies, for the role it is routed to or the logistics manager. */
    @Transactional(readOnly = true)
    public NoteResponse getNote(UUID noteId, User user) {
        Note note = noteRepository
                .findByIdWithDetails(noteId)
                .filter(n -> mayAnswer(n, user))
                .orElseThrow(() -> ResourceNotFoundException.of("Note", noteId));
        return toResponse(note);
    }

    /** The notes on one of the customer's requests, with their replies. Another club's request is not found. */
    @Transactional(readOnly = true)
    public List<NoteResponse> listNotesForCustomer(UUID requestId, User customer) {
        Club club = clubService.requireClub(customer);
        requestRepository
                .findByIdAndClubId(requestId, club.getId())
                .orElseThrow(() -> ResourceNotFoundException.of("TransportRequest", requestId));
        return noteRepository.findByRequestAndClubWithDetails(requestId, club.getId()).stream()
                .map(this::toResponse)
                .toList();
    }

    /**
     * Sends a customer note on their request. The topic decides the role that answers it, the reply is due by the
     * end of the next business day, and everyone holding that role is told.
     */
    @Transactional
    public NoteResponse createForCustomer(UUID requestId, CreateCustomerNoteRequest body, User customer) {
        Club club = clubService.requireClub(customer);
        TransportRequest request = requestRepository
                .findByIdAndClubId(requestId, club.getId())
                .orElseThrow(() -> ResourceNotFoundException.of("TransportRequest", requestId));
        TransportJob job = jobRepository.findByRequestId(requestId).orElse(null);

        Note note = new Note();
        note.setClub(club);
        note.setRequest(request);
        note.setJob(job);
        note.setTopic(body.topic());
        note.setRoutedRole(body.topic().routedRole());
        note.setCreatedBy(customer);
        String text = body.body().trim();
        note.setSubject(subjectOf(text));
        note.setBody(text);
        note.setReplyDueAt(replyDueAt(clock.instant()));
        if (body.checklistItemId() != null) {
            note.setChecklistItem(itemOnJob(body.checklistItemId(), job));
        }
        if (body.attachedFileId() != null) {
            note.setAttachedFile(fileService.requireAttachable(body.attachedFileId(), customer));
        }
        Note saved = noteRepository.save(note);

        notificationService.notify(
                NotificationKind.NOTE_RECEIVED,
                Audience.role(saved.getRoutedRole()),
                Subject.note(saved),
                "New note from " + club.getName() + ": " + saved.getSubject(),
                "Reply by " + BusinessTime.DAY.format(saved.getReplyDueAt().atZone(BusinessTime.ZONE)) + ".");
        return toResponse(saved);
    }

    /** Reply to a customer note and optionally move checklist item deadline. */
    @Transactional
    public NoteResponse replyToNote(UUID noteId, CreateNoteReplyRequest request, User author) {
        Note note = noteRepository
                .findById(noteId)
                .filter(n -> mayAnswer(n, author))
                .orElseThrow(() -> ResourceNotFoundException.of("Note", noteId));

        NoteReply reply = new NoteReply();
        reply.setNote(note);
        reply.setAuthor(author);
        reply.setBody(request.getBody().trim());
        noteReplyRepository.save(reply);

        note.setStatus(NoteStatus.ANSWERED);

        // Optional action: move deadline of the associated checklist item
        if (request.getMoveDueDateTo() != null && note.getChecklistItem() != null) {
            ChecklistItem item = note.getChecklistItem();
            item.setDueDate(request.getMoveDueDateTo());
            checklistItemRepository.save(item);

            auditService.recordDecision(
                    author,
                    "NOTE_MOVED_DEADLINE",
                    "Moved checklist item deadline to " + request.getMoveDueDateTo() + " upon customer note reply",
                    "ChecklistItem",
                    item.getId(),
                    note.getJob() != null ? note.getJob().getCode() : null,
                    request.getReasonForMove() != null ? request.getReasonForMove() : "Customer note reply",
                    null,
                    "{\"dueDate\":\"" + request.getMoveDueDateTo() + "\"}");
        }

        Note savedNote = noteRepository.save(note);

        auditService.recordDecision(
                author,
                "NOTE_REPLIED",
                "Replied to customer note on "
                        + (note.getRequest() != null ? note.getRequest().getCode() : "Job"),
                "Note",
                savedNote.getId(),
                note.getJob() != null ? note.getJob().getCode() : null,
                "Staff replied to customer note",
                "OPEN",
                "ANSWERED");

        notificationService.notify(
                NotificationKind.NOTE_ANSWERED,
                Audience.club(note.getClub().getId()),
                Subject.note(savedNote),
                formatUserName(author) + " answered your note",
                savedNote.getSubject());
        return toResponse(savedNote);
    }

    private NoteResponse toResponse(Note n) {
        Instant now = clock.instant();
        boolean isDueToday = false;
        boolean isOverdue = false;

        if (n.getReplyDueAt() != null && n.getStatus() == NoteStatus.OPEN) {
            if (now.isAfter(n.getReplyDueAt())) {
                isOverdue = true;
            } else {
                // "Reply today" is a calendar day in the business time zone, not the next 24 hours.
                isDueToday = n.getReplyDueAt().atZone(BusinessTime.ZONE).toLocalDate()
                        .equals(now.atZone(BusinessTime.ZONE).toLocalDate());
            }
        }

        List<NoteReplyResponse> replyResponses = n.getReplies() == null
                ? List.of()
                : n.getReplies().stream()
                        .map(r -> NoteReplyResponse.builder()
                                .id(r.getId())
                                .authorId(r.getAuthor() != null ? r.getAuthor().getId() : null)
                                .authorName(formatUserName(r.getAuthor()))
                                .authorRole(extractPrimaryRole(r.getAuthor()))
                                .body(r.getBody())
                                .createdAt(r.getCreatedAt())
                                .build())
                        .toList();

        StoredFile attached = n.getAttachedFile();
        return NoteResponse.builder()
                .id(n.getId())
                .clubId(n.getClub() != null ? n.getClub().getId() : null)
                .clubName(n.getClub() != null ? n.getClub().getName() : null)
                .requestId(n.getRequest() != null ? n.getRequest().getId() : null)
                .requestCode(n.getRequest() != null ? n.getRequest().getCode() : null)
                .jobId(n.getJob() != null ? n.getJob().getId() : null)
                .jobCode(n.getJob() != null ? n.getJob().getCode() : null)
                .checklistItemId(
                        n.getChecklistItem() != null ? n.getChecklistItem().getId() : null)
                .checklistItemName(
                        n.getChecklistItem() != null && n.getChecklistItem().getDocumentType() != null
                                ? n.getChecklistItem().getDocumentType().getName()
                                : null)
                .checklistItemDueDate(
                        n.getChecklistItem() != null ? n.getChecklistItem().getDueDate() : null)
                // The item's own validity note, e.g. "Expires in transit"; none when the note is about no item.
                .checklistItemWarning(
                        n.getChecklistItem() != null ? n.getChecklistItem().getValidityNote() : null)
                .topic(n.getTopic())
                .routedRole(n.getRoutedRole())
                .subject(n.getSubject())
                .body(n.getBody())
                .createdById(n.getCreatedBy() != null ? n.getCreatedBy().getId() : null)
                .createdByName(formatUserName(n.getCreatedBy()))
                .createdAt(n.getCreatedAt())
                .replyDueAt(n.getReplyDueAt())
                .status(n.getStatus())
                .isDueToday(isDueToday)
                .isOverdue(isOverdue)
                .attachedFileId(attached != null ? attached.getId() : null)
                .attachedFileName(attached != null ? attached.getFileName() : null)
                .attachedFileSizeBytes(attached != null ? attached.getSizeBytes() : null)
                .replies(replyResponses)
                .build();
    }

    /** The role the note is routed to, or the logistics manager, who reads every note. */
    private static boolean mayAnswer(Note note, User user) {
        Set<String> roles = roleNames(user);
        return roles.contains(RoleName.LOGISTICS_MANAGER) || roles.contains(note.getRoutedRole());
    }

    private static Set<String> roleNames(User user) {
        return user.getRoles().stream().map(Role::getName).collect(Collectors.toSet());
    }

    /** A document on the request's own checklist; anything else is not found. */
    private ChecklistItem itemOnJob(UUID checklistItemId, TransportJob job) {
        return checklistItemRepository
                .findById(checklistItemId)
                .filter(item -> job != null && item.getJob() != null && job.getId().equals(item.getJob().getId()))
                .orElseThrow(() -> ResourceNotFoundException.of("ChecklistItem", checklistItemId));
    }

    /** The staff list shows a subject: the note's first line, clipped. */
    static String subjectOf(String body) {
        String firstLine = body.lines().findFirst().orElse(body).strip();
        return firstLine.length() <= SUBJECT_MAX ? firstLine : firstLine.substring(0, SUBJECT_MAX - 1).strip() + "…";
    }

    /**
     * Within one business day: by the end of the next weekday in the business time zone. A note sent on Saturday
     * 26 Sep is due by the end of Monday 28 Sep, one sent on Monday by the end of Tuesday.
     */
    static Instant replyDueAt(Instant sentAt) {
        LocalDate day = sentAt.atZone(BusinessTime.ZONE).toLocalDate().plusDays(1);
        while (day.getDayOfWeek() == DayOfWeek.SATURDAY || day.getDayOfWeek() == DayOfWeek.SUNDAY) {
            day = day.plusDays(1);
        }
        return day.plusDays(1).atStartOfDay(BusinessTime.ZONE).toInstant().minusSeconds(1);
    }

    /** "Đỗ Minh Khôi": family name first, as the rest of the app writes names; the email when there is none. */
    private static String formatUserName(User user) {
        if (user == null) return "User";
        String full = (nullToEmpty(user.getLastName()) + " " + nullToEmpty(user.getFirstName())).strip();
        return full.isEmpty() ? user.getEmail() : full;
    }

    private static String nullToEmpty(String s) {
        return s == null ? "" : s;
    }

    private static String extractPrimaryRole(User user) {
        if (user == null || user.getRoles() == null || user.getRoles().isEmpty()) {
            return "Staff";
        }
        return user.getRoles().iterator().next().getName();
    }
}
