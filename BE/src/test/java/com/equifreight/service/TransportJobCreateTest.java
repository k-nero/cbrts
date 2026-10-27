package com.equifreight.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import com.equifreight.entity.Quotation;
import com.equifreight.entity.TransportJob;
import com.equifreight.entity.TransportRequest;
import com.equifreight.entity.User;
import com.equifreight.entity.enums.CodePrefix;
import com.equifreight.entity.enums.DossierStatus;
import com.equifreight.entity.enums.JobStage;
import com.equifreight.repository.CrewAssignmentRepository;
import com.equifreight.repository.LoadPlanRepository;
import com.equifreight.repository.RoutePlanRepository;
import com.equifreight.repository.TransportJobRepository;
import java.time.Instant;
import org.junit.jupiter.api.Test;

/** BR-F1-05: the job an approved request becomes. */
class TransportJobCreateTest {

    @Test
    void theJobTakesItsCodeInBusinessTimeWithTheTeamAndTheWindow() {
        TransportJobRepository jobs = mock(TransportJobRepository.class);
        CodeService codes = mock(CodeService.class);
        JobTripService jobTrips = mock(JobTripService.class);
        when(jobs.saveAndFlush(any())).thenAnswer(i -> i.getArgument(0));
        // 31 Dec 2026, 17:30 UTC is 1 Jan 2027 in Ho Chi Minh City.
        when(codes.next(CodePrefix.CBRT, 2027)).thenReturn("CBRT-2027-001");
        TransportJobService service = new TransportJobService(
                jobs,
                mock(LoadPlanService.class),
                mock(RoutePlanService.class),
                mock(CrewAssignmentService.class),
                mock(LoadPlanRepository.class),
                mock(RoutePlanRepository.class),
                mock(CrewAssignmentRepository.class),
                mock(ClearanceService.class),
                mock(AuditService.class),
                mock(NotificationService.class),
                codes,
                jobTrips,
                mock(JourneyService.class),
                mock(com.equifreight.repository.FlightRepository.class));
        TransportRequest request = new TransportRequest();
        request.setWindowStart(Instant.parse("2027-01-20T02:00:00Z"));
        request.setWindowEnd(Instant.parse("2027-01-20T05:00:00Z"));
        Quotation accepted = new Quotation();
        User yen = new User();
        User lan = new User();
        User khoi = new User();
        Instant at = Instant.parse("2026-12-31T17:30:00Z");

        TransportJob job = service.createApproved(request, accepted, yen, lan, khoi, at);

        assertThat(job.getCode()).isEqualTo("CBRT-2027-001");
        assertThat(job.getRequest()).isSameAs(request);
        assertThat(job.getQuotation()).isSameAs(accepted);
        assertThat(job.getApprovedBy()).isSameAs(yen);
        assertThat(job.getApprovedAt()).isEqualTo(at);
        assertThat(job.getTransportSpecialist()).isSameAs(lan);
        assertThat(job.getCoordinator()).isSameAs(khoi);
        assertThat(job.getWindowStart()).isEqualTo(request.getWindowStart());
        assertThat(job.getWindowEnd()).isEqualTo(request.getWindowEnd());
        assertThat(job.getStage()).isEqualTo(JobStage.DOCUMENTS);
        assertThat(job.getDossierStatus()).isEqualTo(DossierStatus.OPEN);
        assertThat(job.getPlannedDepartureAt()).isNull();
        // No trip yet: the fleet coordinator adds the journey's first trip (US-F3-21).
        verifyNoInteractions(jobTrips);
    }
}
