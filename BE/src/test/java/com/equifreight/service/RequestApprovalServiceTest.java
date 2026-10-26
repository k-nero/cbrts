package com.equifreight.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.equifreight.configuration.BusinessTime;
import com.equifreight.entity.Club;
import com.equifreight.entity.Quotation;
import com.equifreight.entity.RequestHorse;
import com.equifreight.entity.TransportJob;
import com.equifreight.entity.TransportRequest;
import com.equifreight.entity.User;
import com.equifreight.entity.enums.NotificationKind;
import com.equifreight.entity.enums.QuotationStatus;
import com.equifreight.entity.enums.RequestStatus;
import com.equifreight.entity.enums.RoleName;
import com.equifreight.entity.enums.UserStatus;
import com.equifreight.exception.BusinessException;
import com.equifreight.exception.ConflictException;
import com.equifreight.model.approval.ApprovalOptionsResponse;
import com.equifreight.model.approval.ApproveRequest;
import com.equifreight.repository.QuotationRepository;
import com.equifreight.repository.TransportJobRepository;
import com.equifreight.repository.TransportRequestRepository;
import com.equifreight.repository.UserJobCount;
import com.equifreight.repository.UserRepository;
import com.equifreight.service.notification.Audience;
import com.equifreight.service.notification.Subject;
import java.time.Clock;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

/** US-F1-07, BR-F1-04 to 06: the logistics manager approves an accepted request into one job, or rejects it. */
class RequestApprovalServiceTest {

    static final Instant NOW = Instant.parse("2026-10-23T03:00:00Z");

    TransportRequestRepository requests;
    QuotationRepository quotations;
    TransportJobRepository jobs;
    UserRepository users;
    TransportJobService jobService;
    ClearanceService clearance;
    RequestReviewService review;
    AuditService audit;
    NotificationService notifications;
    RequestApprovalService service;

    User yen;
    User lan;
    User thao;
    User khoi;
    TransportRequest request;
    Quotation accepted;
    TransportJob job;

    @BeforeEach
    void setUp() {
        requests = mock(TransportRequestRepository.class);
        quotations = mock(QuotationRepository.class);
        jobs = mock(TransportJobRepository.class);
        users = mock(UserRepository.class);
        jobService = mock(TransportJobService.class);
        clearance = mock(ClearanceService.class);
        review = mock(RequestReviewService.class);
        audit = mock(AuditService.class);
        notifications = mock(NotificationService.class);
        service = new RequestApprovalService(
                requests,
                quotations,
                jobs,
                users,
                jobService,
                clearance,
                review,
                audit,
                notifications,
                Clock.fixed(NOW, BusinessTime.ZONE),
                mock(RequestFleetService.class));

        yen = user("Hải Yến", "Vũ");
        lan = user("Thị Lan", "Nguyễn");
        thao = user("Thu Thảo", "Bùi");
        khoi = user("Minh Khôi", "Đỗ");
        when(users.findByRoleAndStatus(RoleName.TRANSPORT_SPECIALIST, UserStatus.ACTIVE))
                .thenReturn(List.of(lan, thao));
        when(users.findByRoleAndStatus(RoleName.FLEET_COORDINATOR, UserStatus.ACTIVE))
                .thenReturn(List.of(khoi));

        Club club = new Club();
        club.setId(UUID.randomUUID());
        club.setName("Saigon Turf Club");
        request = new TransportRequest();
        request.setId(UUID.randomUUID());
        request.setCode("REQ-2026-0194");
        request.setClub(club);
        request.setStatus(RequestStatus.CUSTOMER_ACCEPTED);
        request.getHorses().add(new RequestHorse());
        when(requests.findByIdForUpdate(request.getId())).thenReturn(Optional.of(request));

        accepted = new Quotation();
        accepted.setId(UUID.randomUUID());
        accepted.setCode("Q-2026-0189");
        accepted.setVersionNo((short) 1);
        accepted.setStatus(QuotationStatus.ACCEPTED);
        when(quotations.findFirstByRequestIdAndStatusOrderByVersionNoDesc(request.getId(), QuotationStatus.ACCEPTED))
                .thenReturn(Optional.of(accepted));

        job = new TransportJob();
        job.setId(UUID.randomUUID());
        job.setCode("CBRT-2026-042");
        when(jobService.createApproved(any(), any(), any(), any(), any(), any()))
                .thenReturn(job);
    }

    static User user(String first, String last) {
        User u = new User();
        u.setId(UUID.randomUUID());
        u.setFirstName(first);
        u.setLastName(last);
        return u;
    }

    ApproveRequest team(User specialist, User coordinator) {
        return new ApproveRequest(specialist.getId(), coordinator.getId());
    }

    @Test
    void approvalCreatesOneJobWithItsTeamAndItsChecklist() {
        service.approve(yen, request.getId(), team(lan, khoi));

        assertThat(request.getStatus()).isEqualTo(RequestStatus.APPROVED);
        verify(clearance).requireChecklistSource(request);
        verify(jobService).createApproved(request, accepted, yen, lan, khoi, NOW);
        verify(clearance).generateChecklist(job.getId(), yen);
        verify(audit)
                .recordDecision(
                        eq(yen),
                        eq("REQUEST_APPROVED"),
                        eq("Approved into job CBRT-2026-042 at quotation Q-2026-0189 v1; Nguyễn Thị Lan, transport"
                                + " specialist, and Đỗ Minh Khôi, fleet & route coordinator"),
                        eq("TRANSPORT_REQUEST"),
                        eq(request.getId()),
                        eq("REQ-2026-0194"),
                        isNull(),
                        eq("{\"status\":\"CUSTOMER_ACCEPTED\"}"),
                        eq("{\"status\":\"APPROVED\",\"job\":\"CBRT-2026-042\"}"));
        verify(notifications)
                .notify(
                        eq(NotificationKind.REQUEST_APPROVED),
                        eq(Audience.club(request.getClub().getId())),
                        eq(Subject.request(request)),
                        eq("REQ-2026-0194 is approved: job CBRT-2026-042"),
                        anyString());
        verify(notifications)
                .notify(
                        eq(NotificationKind.JOB_ASSIGNED),
                        eq(Audience.staff(lan)),
                        eq(Subject.job(job)),
                        anyString(),
                        anyString());
        verify(notifications)
                .notify(
                        eq(NotificationKind.JOB_ASSIGNED),
                        eq(Audience.staff(khoi)),
                        eq(Subject.job(job)),
                        anyString(),
                        anyString());
        verify(review).view(request.getId());
    }

    @Test
    void onlyAnAcceptedRequestIsApproved() {
        request.setStatus(RequestStatus.QUOTED);

        assertThatThrownBy(() -> service.approve(yen, request.getId(), team(lan, khoi)))
                .isInstanceOf(ConflictException.class)
                .hasMessage("REQ-2026-0194 can be approved once the customer accepts its quotation; it is quoted.")
                .extracting("code")
                .isEqualTo("REQUEST_NOT_ACCEPTED");
        assertNothingWritten(RequestStatus.QUOTED);
    }

    @Test
    void anApprovedRequestIsNotApprovedTwice() {
        request.setStatus(RequestStatus.APPROVED);

        assertThatThrownBy(() -> service.approve(yen, request.getId(), team(lan, khoi)))
                .hasMessage("REQ-2026-0194 is already approved.");
        verify(jobService, never()).createApproved(any(), any(), any(), any(), any(), any());
    }

    @Test
    void exactlyOneJobPerRequest() {
        when(jobs.existsByRequestId(request.getId())).thenReturn(true);

        assertThatThrownBy(() -> service.approve(yen, request.getId(), team(lan, khoi)))
                .extracting("code")
                .isEqualTo("JOB_EXISTS");
        assertNothingWritten(RequestStatus.CUSTOMER_ACCEPTED);
    }

    @Test
    void theTeamMustBeActiveInTheirRoles() {
        // Khôi is a coordinator, not a transport specialist.
        assertThatThrownBy(() -> service.approve(yen, request.getId(), team(khoi, khoi)))
                .isInstanceOf(BusinessException.class)
                .hasMessage("Choose an active transport specialist for the job.");
        assertThatThrownBy(() -> service.approve(yen, request.getId(), team(lan, thao)))
                .hasMessage("Choose an active fleet & route coordinator for the job.");
        assertNothingWritten(RequestStatus.CUSTOMER_ACCEPTED);
    }

    @Test
    void withNoPublishedCatalogNothingIsWritten() {
        doThrow(new BusinessException("CHECKLIST_NO_CATALOG", "There is no published regulation catalog for Thailand"))
                .when(clearance)
                .requireChecklistSource(request);

        assertThatThrownBy(() -> service.approve(yen, request.getId(), team(lan, khoi)))
                .extracting("code")
                .isEqualTo("CHECKLIST_NO_CATALOG");
        assertNothingWritten(RequestStatus.CUSTOMER_ACCEPTED);
    }

    @Test
    void aRejectionNeedsAReasonTheCustomerReads() {
        request.setStatus(RequestStatus.UNDER_REVIEW);

        assertThatThrownBy(() -> service.reject(yen, request.getId(), "   "))
                .isInstanceOf(BusinessException.class)
                .extracting("code")
                .isEqualTo("REASON_REQUIRED");
        assertThat(request.getStatus()).isEqualTo(RequestStatus.UNDER_REVIEW);

        service.reject(yen, request.getId(), " No climate stall free in the window. ");

        assertThat(request.getStatus()).isEqualTo(RequestStatus.REJECTED);
        assertThat(request.getRejectReason()).isEqualTo("No climate stall free in the window.");
        verify(audit)
                .recordDecision(
                        eq(yen),
                        eq("REQUEST_REJECTED"),
                        eq("Rejected: No climate stall free in the window."),
                        eq("TRANSPORT_REQUEST"),
                        eq(request.getId()),
                        eq("REQ-2026-0194"),
                        eq("No climate stall free in the window."),
                        eq("{\"status\":\"UNDER_REVIEW\"}"),
                        eq("{\"status\":\"REJECTED\"}"));
        verify(notifications)
                .notify(
                        NotificationKind.REQUEST_REJECTED,
                        Audience.club(request.getClub().getId()),
                        Subject.request(request),
                        "REQ-2026-0194 was rejected",
                        "No climate stall free in the window.");
    }

    @Test
    void anAcceptedRequestCanStillBeRejected() {
        service.reject(yen, request.getId(), "Capacity gone");

        assertThat(request.getStatus()).isEqualTo(RequestStatus.REJECTED);
    }

    @Test
    void anApprovedRequestCantBeRejected() {
        request.setStatus(RequestStatus.APPROVED);

        assertThatThrownBy(() -> service.reject(yen, request.getId(), "Too late"))
                .isInstanceOf(ConflictException.class)
                .hasMessage("REQ-2026-0194 can't be rejected; it is approved.");
        assertThat(request.getStatus()).isEqualTo(RequestStatus.APPROVED);
    }

    @Test
    void theTeamToChooseFromHasTheLeastLoadedFirst() {
        when(jobs.countOpenBySpecialist(any())).thenReturn(List.of(count(lan, 3)));
        when(jobs.countOpenByCoordinator(any())).thenReturn(List.of());

        ApprovalOptionsResponse options = service.options();

        assertThat(options.specialists())
                .extracting(ApprovalOptionsResponse.TeamMember::name, ApprovalOptionsResponse.TeamMember::openJobs)
                .containsExactly(
                        org.assertj.core.groups.Tuple.tuple("Bùi Thu Thảo", 0L),
                        org.assertj.core.groups.Tuple.tuple("Nguyễn Thị Lan", 3L));
        assertThat(options.suggestedSpecialistId()).isEqualTo(thao.getId());
        assertThat(options.suggestedCoordinatorId()).isEqualTo(khoi.getId());
    }

    static UserJobCount count(User user, long jobs) {
        return new UserJobCount() {
            public UUID getUserId() {
                return user.getId();
            }

            public long getJobs() {
                return jobs;
            }
        };
    }

    void assertNothingWritten(RequestStatus status) {
        assertThat(request.getStatus()).isEqualTo(status);
        verify(requests, never()).saveAndFlush(any());
        verify(jobService, never()).createApproved(any(), any(), any(), any(), any(), any());
        verify(clearance, never()).generateChecklist(any(), any());
        verify(audit, never())
                .recordDecision(any(), anyString(), anyString(), anyString(), any(), any(), any(), any(), any());
    }
}
