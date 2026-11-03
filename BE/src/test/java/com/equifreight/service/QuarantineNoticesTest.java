package com.equifreight.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.equifreight.entity.Club;
import com.equifreight.entity.Place;
import com.equifreight.entity.QuarantinePeriod;
import com.equifreight.entity.TransportJob;
import com.equifreight.entity.TransportRequest;
import com.equifreight.entity.User;
import com.equifreight.entity.enums.NotificationKind;
import com.equifreight.service.notification.Audience;
import com.equifreight.service.notification.Subject;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

/** US-F3-22: who hears when a quarantine is scheduled, changed or completed. */
class QuarantineNoticesTest {

    private final NotificationService notifications = mock(NotificationService.class);
    private final JourneyService journeys = mock(JourneyService.class);
    private final QuarantineNotices notices = new QuarantineNotices(notifications, journeys);

    private final User khoi = new User();
    private final User yen = new User();
    private final Club club = new Club();
    private TransportJob job;
    private QuarantinePeriod quarantine;

    @BeforeEach
    void setUp() {
        khoi.setId(UUID.randomUUID());
        yen.setId(UUID.randomUUID());
        club.setId(UUID.randomUUID());
        TransportRequest request = new TransportRequest();
        request.setClub(club);
        job = new TransportJob();
        job.setId(UUID.randomUUID());
        job.setCode("CBRT-2026-001");
        job.setRequest(request);
        job.setCoordinator(khoi);
        job.setApprovedBy(yen);
        Place barn = new Place();
        barn.setId(UUID.randomUUID());
        barn.setName("Đại Nam Racecourse isolation barn");
        quarantine = new QuarantinePeriod();
        quarantine.setId(UUID.randomUUID());
        quarantine.setJob(job);
        quarantine.setPlace(barn);
        quarantine.setStartsOn(LocalDate.of(2026, 11, 11));
        quarantine.setEndsOn(LocalDate.of(2026, 11, 25));
        when(journeys.clashes(job, quarantine)).thenReturn(List.of());
    }

    @Test
    @DisplayName("A scheduled quarantine tells the coordinator what to plan and the club where its horses wait")
    void scheduledTellsTheCoordinatorAndTheClub() {
        notices.scheduled(quarantine);

        String key = "QUARANTINE_SCHEDULED:" + quarantine.getId();
        verify(notifications)
                .notify(
                        NotificationKind.QUARANTINE_SCHEDULED,
                        Audience.staff(khoi),
                        Subject.tracking(job),
                        "Quarantine scheduled for CBRT-2026-001",
                        "Đại Nam Racecourse isolation barn, 11–25 Nov. Plan a trip that brings the horses there by"
                                + " 11 Nov and one that collects them from 25 Nov.",
                        key);
        verify(notifications)
                .notify(
                        NotificationKind.QUARANTINE_SCHEDULED,
                        Audience.club(club.getId()),
                        Subject.tracking(job),
                        "Your horses' quarantine is scheduled",
                        "Before they travel, CBRT-2026-001's horses stay at Đại Nam Racecourse isolation barn from"
                                + " 11 Nov to 25 Nov for their quarantine. We take them there and collect them"
                                + " afterwards.",
                        key);
        verify(notifications, never())
                .notify(eq(NotificationKind.QUARANTINE_CONFLICT), any(), any(), anyString(), anyString(), anyString());
    }

    @Test
    @DisplayName("A change that clashes with the planned trips also tells the manager who approved the job")
    void aClashingChangeTellsTheManager() {
        String clash = "TRP-2026-002 collects the horses at Đại Nam Racecourse isolation barn at 08:00 on 20 Nov,"
                + " before their quarantine there ends on 25 Nov.";
        when(journeys.clashes(job, quarantine)).thenReturn(List.of(clash));

        notices.changed(quarantine, "Đại Nam Racecourse isolation barn, 4–18 Nov");

        verify(notifications)
                .notify(
                        NotificationKind.QUARANTINE_CHANGED,
                        Audience.staff(khoi),
                        Subject.tracking(job),
                        "Quarantine for CBRT-2026-001 changed",
                        "Now Đại Nam Racecourse isolation barn, 11–25 Nov; it was Đại Nam Racecourse isolation barn,"
                                + " 4–18 Nov. Check the trips on either side of it.",
                        "QUARANTINE_CHANGED:" + quarantine.getId());
        verify(notifications)
                .notify(
                        NotificationKind.QUARANTINE_CONFLICT,
                        Audience.staff(yen),
                        Subject.tracking(job),
                        "Quarantine clashes with CBRT-2026-001's planned trips",
                        clash + " The coordinator has been told.",
                        "QUARANTINE_CONFLICT:" + quarantine.getId());
    }

    @Test
    @DisplayName("A completed quarantine tells the coordinator and the club, never the manager")
    void completedTellsTheCoordinatorAndTheClub() {
        notices.completed(quarantine);

        ArgumentCaptor<Audience> audiences = ArgumentCaptor.forClass(Audience.class);
        verify(notifications, org.mockito.Mockito.times(2))
                .notify(
                        eq(NotificationKind.QUARANTINE_COMPLETED),
                        audiences.capture(),
                        eq(Subject.tracking(job)),
                        anyString(),
                        anyString(),
                        eq("QUARANTINE_COMPLETED:" + quarantine.getId()));
        assertThat(audiences.getAllValues()).containsExactly(Audience.staff(khoi), Audience.club(club.getId()));
        verify(journeys, never()).clashes(any(), any());
    }
}
