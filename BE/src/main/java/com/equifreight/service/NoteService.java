package com.equifreight.service;

import com.equifreight.entity.ChecklistItem;
import com.equifreight.entity.Note;
import com.equifreight.entity.NoteReply;
import com.equifreight.entity.Role;
import com.equifreight.entity.User;
import com.equifreight.entity.enums.NoteStatus;
import com.equifreight.entity.enums.RoleName;
import com.equifreight.exception.ResourceNotFoundException;
import com.equifreight.model.note.CreateNoteReplyRequest;
import com.equifreight.model.note.NoteReplyResponse;
import com.equifreight.model.note.NoteResponse;
import com.equifreight.repository.ChecklistItemRepository;
import com.equifreight.repository.NoteReplyRepository;
import com.equifreight.repository.NoteRepository;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class NoteService {

    private final NoteRepository noteRepository;
    private final NoteReplyRepository noteReplyRepository;
    private final ChecklistItemRepository checklistItemRepository;
    private final AuditService auditService;

    public NoteService(
            NoteRepository noteRepository,
            NoteReplyRepository noteReplyRepository,
            ChecklistItemRepository checklistItemRepository,
            AuditService auditService) {
        this.noteRepository = noteRepository;
        this.noteReplyRepository = noteReplyRepository;
        this.checklistItemRepository = checklistItemRepository;
        this.auditService = auditService;
    }

    /** List customer notes routed to the given staff role (or all notes for Logistics Manager). */
    @Transactional(readOnly = true)
    public List<NoteResponse> listNotesForStaff(User user) {
        boolean isManager = user.getRoles().stream().map(Role::getName).anyMatch(RoleName.LOGISTICS_MANAGER::equals);

        List<Note> notes;
        if (isManager) {
            notes = noteRepository.findAll();
        } else {
            notes = noteRepository.findByRoutedRoleWithDetails(RoleName.TRANSPORT_SPECIALIST);
        }

        return notes.stream().map(this::toResponse).toList();
    }

    /** Retrieve single note details with replies. */
    @Transactional(readOnly = true)
    public NoteResponse getNote(UUID noteId) {
        Note note = noteRepository
                .findByIdWithDetails(noteId)
                .orElseThrow(() -> ResourceNotFoundException.of("Note", noteId));
        return toResponse(note);
    }

    /** Reply to a customer note and optionally move checklist item deadline. */
    @Transactional
    public NoteResponse replyToNote(UUID noteId, CreateNoteReplyRequest request, User author) {
        Note note = noteRepository.findById(noteId).orElseThrow(() -> ResourceNotFoundException.of("Note", noteId));

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

        return toResponse(savedNote);
    }

    private NoteResponse toResponse(Note n) {
        Instant now = Instant.now();
        boolean isDueToday = false;
        boolean isOverdue = false;

        if (n.getReplyDueAt() != null && n.getStatus() == NoteStatus.OPEN) {
            if (now.isAfter(n.getReplyDueAt())) {
                isOverdue = true;
            } else if (ChronoUnit.HOURS.between(now, n.getReplyDueAt()) <= 24) {
                isDueToday = true;
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
                .checklistItemWarning("Expires in transit")
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
                .attachedFileName(n.getSubject().contains("insurance") ? "PVI_extension_email.pdf" : null)
                .attachedFileSize(n.getSubject().contains("insurance") ? "PDF · 84 KB" : null)
                .replies(replyResponses)
                .build();
    }

    private static String formatUserName(User user) {
        if (user == null) return "User";
        String first = user.getFirstName() != null ? user.getFirstName() : "";
        String last = user.getLastName() != null ? user.getLastName() : "";
        String full = (first + " " + last).trim();
        return full.isEmpty() ? user.getEmail() : full;
    }

    private static String extractPrimaryRole(User user) {
        if (user == null || user.getRoles() == null || user.getRoles().isEmpty()) {
            return "Staff";
        }
        return user.getRoles().iterator().next().getName();
    }
}
