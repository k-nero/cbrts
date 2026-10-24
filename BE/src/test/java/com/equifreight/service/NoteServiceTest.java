package com.equifreight.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.equifreight.entity.ChecklistItem;
import com.equifreight.entity.Club;
import com.equifreight.entity.Note;
import com.equifreight.entity.Role;
import com.equifreight.entity.TransportJob;
import com.equifreight.entity.TransportRequest;
import com.equifreight.entity.User;
import com.equifreight.entity.enums.NoteStatus;
import com.equifreight.entity.enums.NoteTopic;
import com.equifreight.entity.enums.NotificationKind;
import com.equifreight.entity.enums.RoleName;
import com.equifreight.exception.ResourceNotFoundException;
import com.equifreight.model.note.CreateCustomerNoteRequest;
import com.equifreight.model.note.CreateNoteReplyRequest;
import com.equifreight.model.note.NoteResponse;
import com.equifreight.repository.ChecklistItemRepository;
import com.equifreight.repository.NoteReplyRepository;
import com.equifreight.repository.NoteRepository;
import com.equifreight.repository.TransportJobRepository;
import com.equifreight.repository.TransportRequestRepository;
import com.equifreight.service.notification.Audience;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;

/** US-00-08: a customer note is routed by its topic, and only that role (or the logistics manager) answers it. */
class NoteServiceTest {

    // Saturday 26 Sep 2026, 11:31 in Ho Chi Minh City.
    private static final Instant SENT = Instant.parse("2026-09-26T04:31:00Z");

    private final NoteRepository notes = mock(NoteRepository.class);
    private final NoteReplyRepository replies = mock(NoteReplyRepository.class);
    private final ChecklistItemRepository items = mock(ChecklistItemRepository.class);
    private final TransportRequestRepository requests = mock(TransportRequestRepository.class);
    private final TransportJobRepository jobs = mock(TransportJobRepository.class);
    private final ClubService clubs = mock(ClubService.class);
    private final FileService files = mock(FileService.class);
    private final NotificationService notifications = mock(NotificationService.class);
    private final AuditService audit = mock(AuditService.class);

    private NoteService service;
    private Club club;
    private User customer;
    private TransportRequest request;
    private TransportJob job;

    @BeforeEach
    void setUp() {
        service = new NoteService(
                notes, replies, items, requests, jobs, clubs, files, notifications, audit,
                Clock.fixed(SENT, ZoneOffset.UTC));
        club = new Club();
        club.setId(UUID.randomUUID());
        club.setName("Saigon Turf Club");
        customer = user(RoleName.CUSTOMER);
        customer.setClub(club);
        request = new TransportRequest();
        request.setId(UUID.randomUUID());
        request.setCode("REQ-2026-0041");
        request.setClub(club);
        job = new TransportJob();
        job.setId(UUID.randomUUID());
        job.setCode("CBRT-2026-041");
        job.setRequest(request);
        when(clubs.requireClub(customer)).thenReturn(club);
        when(requests.findByIdAndClubId(request.getId(), club.getId())).thenReturn(Optional.of(request));
        when(jobs.findByRequestId(request.getId())).thenReturn(Optional.of(job));
        when(notes.save(any())).thenAnswer(inv -> {
            Note n = inv.getArgument(0);
            n.setId(UUID.randomUUID());
            return n;
        });
    }

    @ParameterizedTest
    @CsvSource({
        "DOCUMENTS, TRANSPORT_SPECIALIST",
        "DATES_PRICE_CHANGES, LOGISTICS_MANAGER",
        "TRIP, FLEET_COORDINATOR",
        "OTHER, LOGISTICS_MANAGER"
    })
    @DisplayName("The topic routes the note to the role that answers it, and that role is told")
    void theTopicRoutesTheNote(NoteTopic topic, String role) {
        NoteResponse sent = service.createForCustomer(
                request.getId(), new CreateCustomerNoteRequest(topic, null, "Is that a problem?", null), customer);

        assertThat(sent.getRoutedRole()).isEqualTo(role);
        assertThat(sent.getStatus()).isEqualTo(NoteStatus.OPEN);
        assertThat(sent.getRequestCode()).isEqualTo("REQ-2026-0041");
        assertThat(sent.getJobCode()).isEqualTo("CBRT-2026-041");
        verify(notifications)
                .notify(eq(NotificationKind.NOTE_RECEIVED), eq(Audience.role(role)), any(), anyString(), anyString());
    }

    @Test
    @DisplayName("A note sent on Saturday is due by the end of Monday, in the business time zone")
    void theReplyIsDueWithinOneBusinessDay() {
        // Monday 28 Sep 2026, 23:59:59 in Ho Chi Minh City.
        assertThat(NoteService.replyDueAt(SENT)).isEqualTo(Instant.parse("2026-09-28T16:59:59Z"));
        // Monday 28 Sep 08:10 → end of Tuesday 29 Sep.
        assertThat(NoteService.replyDueAt(Instant.parse("2026-09-28T01:10:00Z")))
                .isEqualTo(Instant.parse("2026-09-29T16:59:59Z"));
        // Friday 2 Oct → end of Monday 5 Oct.
        assertThat(NoteService.replyDueAt(Instant.parse("2026-10-02T09:00:00Z")))
                .isEqualTo(Instant.parse("2026-10-05T16:59:59Z"));
    }

    @Test
    @DisplayName("The subject is the note's first line, clipped for the staff list")
    void theSubjectIsTheFirstLine() {
        assertThat(NoteService.subjectOf("Transit insurance\nPVI issues it on 1 Oct.")).isEqualTo("Transit insurance");
        assertThat(NoteService.subjectOf("x".repeat(300))).hasSize(160).endsWith("…");
    }

    @Test
    @DisplayName("Another club's request is not found, and nothing is sent")
    void anotherClubsRequestIsNotFound() {
        UUID foreign = UUID.randomUUID();
        when(requests.findByIdAndClubId(foreign, club.getId())).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.createForCustomer(
                        foreign, new CreateCustomerNoteRequest(NoteTopic.OTHER, null, "Hello", null), customer))
                .isInstanceOf(ResourceNotFoundException.class);
        verify(notes, never()).save(any());
    }

    @Test
    @DisplayName("A document from another job's checklist is not found")
    void anItemFromAnotherJobIsNotFound() {
        TransportJob other = new TransportJob();
        other.setId(UUID.randomUUID());
        ChecklistItem foreign = new ChecklistItem();
        foreign.setId(UUID.randomUUID());
        foreign.setJob(other);
        when(items.findById(foreign.getId())).thenReturn(Optional.of(foreign));

        assertThatThrownBy(() -> service.createForCustomer(
                        request.getId(),
                        new CreateCustomerNoteRequest(NoteTopic.DOCUMENTS, foreign.getId(), "Hello", null),
                        customer))
                .isInstanceOf(ResourceNotFoundException.class);
        verify(notes, never()).save(any());
    }

    @Test
    @DisplayName("Staff see only the notes routed to their own role; the logistics manager sees every note")
    void staffSeeTheirOwnRolesNotes() {
        when(notes.findByRoutedRolesWithDetails(Set.of(RoleName.FLEET_COORDINATOR))).thenReturn(List.of());
        when(notes.findAllWithDetails()).thenReturn(List.of());

        service.listNotesForStaff(user(RoleName.FLEET_COORDINATOR));
        service.listNotesForStaff(user(RoleName.LOGISTICS_MANAGER));

        verify(notes).findByRoutedRolesWithDetails(Set.of(RoleName.FLEET_COORDINATOR));
        verify(notes).findAllWithDetails();
    }

    @Test
    @DisplayName("A specialist can't open or answer a trip note")
    void anotherRoleCannotAnswer() {
        Note trip = note(NoteTopic.TRIP);
        when(notes.findByIdWithDetails(trip.getId())).thenReturn(Optional.of(trip));
        when(notes.findById(trip.getId())).thenReturn(Optional.of(trip));
        User specialist = user(RoleName.TRANSPORT_SPECIALIST);
        CreateNoteReplyRequest reply = new CreateNoteReplyRequest();
        reply.setBody("Yes.");

        assertThatThrownBy(() -> service.getNote(trip.getId(), specialist))
                .isInstanceOf(ResourceNotFoundException.class);
        assertThatThrownBy(() -> service.replyToNote(trip.getId(), reply, specialist))
                .isInstanceOf(ResourceNotFoundException.class);
        verify(replies, never()).save(any());
    }

    @Test
    @DisplayName("A reply answers the note in its thread and tells the customer's club")
    void aReplyTellsTheCustomer() {
        Note trip = note(NoteTopic.TRIP);
        when(notes.findById(trip.getId())).thenReturn(Optional.of(trip));
        CreateNoteReplyRequest reply = new CreateNoteReplyRequest();
        reply.setBody("Yes, up to 2 nets per horse.");

        NoteResponse answered = service.replyToNote(trip.getId(), reply, user(RoleName.FLEET_COORDINATOR));

        assertThat(answered.getStatus()).isEqualTo(NoteStatus.ANSWERED);
        verify(replies).save(any());
        verify(notifications)
                .notify(
                        eq(NotificationKind.NOTE_ANSWERED),
                        eq(Audience.club(club.getId())),
                        any(),
                        anyString(),
                        anyString());
    }

    private Note note(NoteTopic topic) {
        Note n = new Note();
        n.setId(UUID.randomUUID());
        n.setClub(club);
        n.setRequest(request);
        n.setJob(job);
        n.setTopic(topic);
        n.setRoutedRole(topic.routedRole());
        n.setSubject("Hay nets");
        n.setBody("Can the grooms bring hay nets?");
        n.setCreatedBy(customer);
        return n;
    }

    private static User user(String roleName) {
        Role role = new Role();
        role.setName(roleName);
        User u = new User();
        u.setId(UUID.randomUUID());
        u.setFirstName("Khôi");
        u.setRoles(Set.of(role));
        return u;
    }
}
