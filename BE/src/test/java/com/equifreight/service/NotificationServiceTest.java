package com.equifreight.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.equifreight.configuration.BusinessTime;
import com.equifreight.entity.AuthoritySubmission;
import com.equifreight.entity.Notification;
import com.equifreight.entity.Quotation;
import com.equifreight.entity.TransportJob;
import com.equifreight.entity.TransportRequest;
import com.equifreight.entity.User;
import com.equifreight.entity.enums.NotificationKind;
import com.equifreight.entity.enums.NotificationTone;
import com.equifreight.entity.enums.RoleName;
import com.equifreight.entity.enums.UserStatus;
import com.equifreight.exception.ResourceNotFoundException;
import com.equifreight.model.notification.NotificationResponse;
import com.equifreight.repository.NotificationRepository;
import com.equifreight.repository.UserRepository;
import com.equifreight.service.notification.Audience;
import com.equifreight.service.notification.NotificationStream;
import com.equifreight.service.notification.Subject;
import java.time.Clock;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;

/** US-00-07: who a notification reaches, the page it opens, and reading your own notifications only. */
class NotificationServiceTest {

    static final Instant NOW = Instant.parse("2026-10-23T03:00:00Z");

    NotificationRepository notifications;
    UserRepository users;
    NotificationStream stream;
    NotificationService service;
    TransportRequest request;
    TransportJob job;
    User me;

    @BeforeEach
    void setUp() {
        notifications = mock(NotificationRepository.class);
        users = mock(UserRepository.class);
        stream = mock(NotificationStream.class);
        service = new NotificationService(notifications, users, stream, Clock.fixed(NOW, BusinessTime.ZONE));
        request = new TransportRequest();
        request.setId(UUID.randomUUID());
        request.setCode("REQ-2026-0031");
        job = new TransportJob();
        job.setId(UUID.randomUUID());
        job.setCode("CBRT-2026-014");
        job.setRequest(request);
        me = user();
    }

    static User user() {
        User u = new User();
        u.setId(UUID.randomUUID());
        return u;
    }

    @Test
    void aClubNoticeReachesEveryAccountThatIsNotDisabledOnItsRequestPage() {
        UUID clubId = UUID.randomUUID();
        User bookings = user();
        User trainer = user();
        when(users.findByClubIdAndStatusNot(clubId, UserStatus.DISABLED)).thenReturn(List.of(bookings, trainer));

        service.notify(
                NotificationKind.REQUEST_INFO_REQUIRED,
                Audience.club(clubId),
                Subject.request(request),
                "REQ-2026-0031 needs your answer",
                "Which stable do we collect from?");

        for (User account : List.of(bookings, trainer)) {
            verify(notifications)
                    .upsert(
                            account.getId(),
                            "REQUEST_INFO_REQUIRED",
                            "REQ-2026-0031 needs your answer",
                            "Which stable do we collect from?",
                            "TRANSPORT_REQUEST",
                            request.getId(),
                            "REQ-2026-0031",
                            "/requests/" + request.getId() + "/submitted",
                            null);
        }
        verify(stream).changedAfterCommit(List.of(bookings.getId(), trainer.getId()));
    }

    @Test
    void aRoleNoticeReachesItsActiveHoldersOnTheStaffPage() {
        User yen = user();
        when(users.findByRoleAndStatus(RoleName.LOGISTICS_MANAGER, UserStatus.ACTIVE))
                .thenReturn(List.of(yen));

        service.notify(
                NotificationKind.REQUEST_CANCELLED,
                Audience.role(RoleName.LOGISTICS_MANAGER),
                Subject.request(request),
                "Saigon Turf Club cancelled REQ-2026-0031",
                "It was quoted; no fee.");

        verify(notifications)
                .upsert(
                        eq(yen.getId()),
                        eq("REQUEST_CANCELLED"),
                        anyString(),
                        anyString(),
                        eq("TRANSPORT_REQUEST"),
                        eq(request.getId()),
                        eq("REQ-2026-0031"),
                        eq("/staff/requests/" + request.getId()),
                        isNull());
    }

    @Test
    void eachAudienceOpensARecordOnItsOwnSurface() {
        Quotation q = new Quotation();
        q.setId(UUID.randomUUID());
        q.setCode("Q-2026-0040");
        q.setRequest(request);
        AuthoritySubmission submission = new AuthoritySubmission();
        submission.setId(UUID.randomUUID());
        submission.setJob(job);
        Audience club = Audience.club(UUID.randomUUID());
        Audience staff = Audience.staff(user());
        Audience escorts = Audience.escorts(List.of(user()));

        assertThat(NotificationService.linkFor(Subject.quotation(q), club))
                .isEqualTo("/requests/" + request.getId() + "/quotation");
        assertThat(NotificationService.linkFor(Subject.quotation(q), staff))
                .isEqualTo("/staff/requests/" + request.getId());
        assertThat(NotificationService.linkFor(Subject.job(job), club))
                .isEqualTo("/requests/" + request.getId() + "/submitted");
        assertThat(NotificationService.linkFor(Subject.job(job), staff)).isEqualTo("/staff/jobs/" + job.getId());
        assertThat(NotificationService.linkFor(Subject.job(job), escorts)).isEqualTo("/escort");
        assertThat(NotificationService.linkFor(Subject.job(job), Audience.role(RoleName.ESCORT)))
                .isEqualTo("/escort");
        assertThat(NotificationService.linkFor(Subject.authoritySubmission(submission), staff))
                .isEqualTo("/staff/jobs/" + job.getId() + "?tab=authorities");
        assertThat(NotificationService.linkFor(Subject.authoritySubmission(submission), club))
                .isEqualTo("/requests/" + request.getId() + "/submitted");
        assertThat(NotificationService.linkFor(Subject.documents(job), club))
                .isEqualTo("/requests/" + request.getId() + "/documents");
        assertThat(NotificationService.linkFor(Subject.documents(job), staff))
                .isEqualTo("/staff/documents?jobId=" + job.getId());
    }

    @Test
    void aRepeatedNoticeCarriesItsDedupeKey() {
        User yen = user();

        service.notify(
                NotificationKind.DOSSIER_LATE,
                Audience.staff(yen),
                Subject.job(job),
                "Import permit for CBRT-2026-014 is late",
                "Customs was expected to answer by 2026-10-20.",
                "DOSSIER_LATE:42");

        verify(notifications)
                .upsert(
                        eq(yen.getId()),
                        eq("DOSSIER_LATE"),
                        anyString(),
                        anyString(),
                        eq("TRANSPORT_JOB"),
                        eq(job.getId()),
                        eq("CBRT-2026-014"),
                        eq("/staff/jobs/" + job.getId()),
                        eq("DOSSIER_LATE:42"));
    }

    @Test
    void aBodyLongerThanTheColumnIsClipped() {
        User yen = user();
        String reason = "x".repeat(NotificationService.BODY_MAX + 50);

        service.notify(
                NotificationKind.REQUEST_REJECTED, Audience.staff(yen), Subject.request(request), "Rejected", reason);

        verify(notifications)
                .upsert(
                        any(),
                        any(),
                        any(),
                        eq("x".repeat(NotificationService.BODY_MAX - 1) + "…"),
                        any(),
                        any(),
                        any(),
                        any(),
                        any());
    }

    @Test
    void someoneElsesNotificationIsNotFound() {
        UUID theirs = UUID.randomUUID();
        when(notifications.findByIdAndUserId(theirs, me.getId())).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.markRead(me, theirs)).isInstanceOf(ResourceNotFoundException.class);
        verify(notifications, never()).save(any());
    }

    @Test
    void markingReadStampsTheTimeOnce() {
        Notification unread = new Notification();
        UUID id = UUID.randomUUID();
        when(notifications.findByIdAndUserId(id, me.getId())).thenReturn(Optional.of(unread));

        service.markRead(me, id);
        service.markRead(me, id);

        assertThat(unread.getReadAt()).isEqualTo(NOW);
        verify(notifications).save(unread);
        verify(stream).changedAfterCommit(List.of(me.getId()));
    }

    @Test
    void markAllReadCountsWhatItMarked() {
        when(notifications.markAllRead(me.getId(), NOW)).thenReturn(7);

        assertThat(service.markAllRead(me).updated()).isEqualTo(7);
        verify(stream).changedAfterCommit(List.of(me.getId()));
    }

    @Test
    void markAllReadWithNothingUnreadTellsNoTab() {
        when(notifications.markAllRead(me.getId(), NOW)).thenReturn(0);

        service.markAllRead(me);

        verify(stream, never()).changedAfterCommit(any());
    }

    @Test
    void theUnreadViewListsOnlyUnreadRowsWithTheirTone() {
        Pageable page = PageRequest.of(0, 20);
        Notification held = new Notification();
        held.setKind(NotificationKind.TRIP_HELD);
        held.setEntityCode("CBRT-2026-014");
        held.setLinkPath("/staff/jobs/" + job.getId());
        when(notifications.findByUserIdAndReadAtIsNull(me.getId(), page)).thenReturn(new PageImpl<>(List.of(held)));

        List<NotificationResponse> rows = service.list(me, true, page).getContent();

        assertThat(rows).singleElement().satisfies(row -> {
            assertThat(row.tone()).isEqualTo(NotificationTone.BAD);
            assertThat(row.entityCode()).isEqualTo("CBRT-2026-014");
        });
        verify(notifications, never()).findByUserId(any(), any());
    }
}
