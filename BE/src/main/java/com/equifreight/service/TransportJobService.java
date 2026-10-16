package com.equifreight.service;

import com.equifreight.entity.*;
import com.equifreight.entity.enums.Channel;
import com.equifreight.entity.enums.DossierStatus;
import com.equifreight.entity.enums.JobStage;
import com.equifreight.entity.enums.LoadPlanStatus;
import com.equifreight.entity.enums.RoutePlanStatus;
import com.equifreight.entity.enums.TripStatus;
import com.equifreight.exception.BusinessException;
import com.equifreight.exception.ResourceNotFoundException;
import com.equifreight.model.job.*;
import com.equifreight.repository.*;
import jakarta.persistence.criteria.Predicate;
import lombok.extern.log4j.Log4j2;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
@Log4j2
public class TransportJobService {

    private final TransportJobRepository transportJobRepository;
    private final LoadPlanService loadPlanService;
    private final RoutePlanService routePlanService;
    private final CrewAssignmentService crewAssignmentService;
    private final LoadPlanRepository loadPlanRepository;
    private final RoutePlanRepository routePlanRepository;
    private final AuditLogRepository auditLogRepository;

    public TransportJobService(TransportJobRepository transportJobRepository,
                               LoadPlanService loadPlanService,
                               RoutePlanService routePlanService,
                               CrewAssignmentService crewAssignmentService,
                               LoadPlanRepository loadPlanRepository,
                               RoutePlanRepository routePlanRepository,
                               AuditLogRepository auditLogRepository) {
        this.transportJobRepository = transportJobRepository;
        this.loadPlanService = loadPlanService;
        this.routePlanService = routePlanService;
        this.crewAssignmentService = crewAssignmentService;
        this.loadPlanRepository = loadPlanRepository;
        this.routePlanRepository = routePlanRepository;
        this.auditLogRepository = auditLogRepository;
    }

    @Transactional(readOnly = true)
    public Page<JobSummaryResponse> search(String q, JobStage stage, String filter, Pageable pageable) {
        Specification<TransportJob> spec = (root, cq, cb) -> {
            var predicates = new ArrayList<Predicate>();

            if (stage != null) {
                predicates.add(cb.equal(root.get("stage"), stage));
            }

            if (filter != null && !filter.isBlank()) {
                switch (filter.toUpperCase()) {
                    case "BLOCKED" -> predicates.add(cb.notEqual(root.get("dossierStatus"), DossierStatus.CLEARANCE_READY));
                    case "IN_TRANSIT" -> predicates.add(cb.or(
                            cb.equal(root.get("stage"), JobStage.TRIP),
                            cb.equal(root.get("tripStatus"), TripStatus.DEPARTED)
                    ));
                    case "NEEDS_ME" -> predicates.add(cb.or(
                            cb.equal(root.get("stage"), JobStage.DOCUMENTS),
                            cb.equal(root.get("stage"), JobStage.CLEARANCE)
                    ));
                    default -> { /* ALL - no extra predicate */ }
                }
            }

            if (q != null && !q.isBlank()) {
                String like = "%" + q.toLowerCase() + "%";
                predicates.add(cb.or(
                        cb.like(cb.lower(root.get("code")), like)
                ));
            }

            return cb.and(predicates.toArray(new Predicate[0]));
        };

        return transportJobRepository.findAll(spec, pageable).map(this::toSummaryResponse);
    }

    @Transactional(readOnly = true)
    public JobDetailResponse getJobDetail(UUID id) {
        TransportJob job = transportJobRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Job not found: " + id));

        List<JobHorseResponse> horses = getJobHorses(job);
        LoadPlanResponse loadPlan = loadPlanService.getOrCreateLoadPlan(job.getId());

        RoutePlanResponse routePlan = null;
        try {
            routePlan = routePlanService.getActiveRoutePlan(job.getId());
        } catch (ResourceNotFoundException e) {
            log.debug("No route plan yet for job {}", job.getCode());
        }

        List<CrewMemberResponse> crew = crewAssignmentService.getCrew(job.getId());

        boolean isClear = job.getDossierStatus() == DossierStatus.CLEARANCE_READY && job.getClearanceReadyAt() != null;
        String gateState = isClear ? "Clear" : "Locked";
        String gateSummary = isClear
                ? "Dossier cleared. Vehicle and trip departure may proceed."
                : "Clearance gate is locked. 9 items are outstanding before departure can be recorded.";

        return JobDetailResponse.builder()
                .id(job.getId())
                .code(job.getCode())
                .originCity(getOriginCity(job))
                .destinationCity(getDestinationCity(job))
                .stage(job.getStage())
                .dossierStatus(job.getDossierStatus())
                .tripStatus(job.getTripStatus())
                .plannedDepartureAt(job.getPlannedDepartureAt())
                .windowStart(job.getWindowStart())
                .windowEnd(job.getWindowEnd())
                .clearanceReadyAt(job.getClearanceReadyAt())
                .blockingReason(getBlockingReason(job))
                .nextStepOwner(getNextStepOwner(job))
                .clearanceGateState(gateState)
                .clearanceGateSummary(gateSummary)
                .horses(horses)
                .loadPlan(loadPlan)
                .routePlan(routePlan)
                .crew(crew)
                .build();
    }

    @Transactional
    public JobDetailResponse signOffTripPlan(UUID jobId, User currentUser) {
        TransportJob job = transportJobRepository.findById(jobId)
                .orElseThrow(() -> new ResourceNotFoundException("Job not found: " + jobId));

        // Validate load plan confirmed
        Optional<LoadPlan> loadPlanOpt = loadPlanRepository.findByJobIdAndStatus(jobId, LoadPlanStatus.CONFIRMED);
        if (loadPlanOpt.isEmpty()) {
            throw new BusinessException("Cannot sign off trip plan: Load plan is not confirmed yet");
        }

        // Validate route plan confirmed
        Optional<RoutePlan> routePlanOpt = routePlanRepository.findByJobIdAndStatus(jobId, RoutePlanStatus.CONFIRMED);
        if (routePlanOpt.isEmpty()) {
            throw new BusinessException("Cannot sign off trip plan: Route plan is not confirmed yet");
        }

        // Validate crew assigned
        List<CrewMemberResponse> crew = crewAssignmentService.getCrew(jobId);
        if (crew.isEmpty()) {
            throw new BusinessException("Cannot sign off trip plan: No crew assigned to this job");
        }

        // Audit log
        AuditLog audit = new AuditLog();
        audit.setActor(currentUser);
        audit.setActorLabel(currentUser != null ? currentUser.getFirstName() + " " + currentUser.getLastName() : "System");
        audit.setChannel(Channel.WEB);
        audit.setAction("SIGN_OFF_TRIP_PLAN");
        audit.setSummary("Signed off overall trip plan (route, load, crew) for job " + job.getCode());
        audit.setEntityCode(job.getCode());
        auditLogRepository.save(audit);

        log.info("Manager / Coordinator signed off trip plan for job {}", job.getCode());
        return getJobDetail(jobId);
    }

    private JobSummaryResponse toSummaryResponse(TransportJob job) {
        List<JobHorseResponse> horses = getJobHorses(job);
        List<String> horseNames = horses.stream().map(JobHorseResponse::getName).toList();

        return JobSummaryResponse.builder()
                .id(job.getId())
                .code(job.getCode())
                .originCity(getOriginCity(job))
                .destinationCity(getDestinationCity(job))
                .horseCount(horses.size())
                .horseNames(horseNames)
                .stage(job.getStage())
                .dossierStatus(job.getDossierStatus())
                .tripStatus(job.getTripStatus())
                .plannedDepartureAt(job.getPlannedDepartureAt())
                .windowStart(job.getWindowStart())
                .windowEnd(job.getWindowEnd())
                .clearanceReadyAt(job.getClearanceReadyAt())
                .blockingReason(getBlockingReason(job))
                .nextStepOwner(getNextStepOwner(job))
                .build();
    }

    private String getOriginCity(TransportJob job) {
        if (job.getRequest() != null) {
            if (job.getRequest().getOriginPlace() != null && job.getRequest().getOriginPlace().getCity() != null) {
                return job.getRequest().getOriginPlace().getCity();
            }
            if (job.getRequest().getCorridor() != null && job.getRequest().getCorridor().getOriginCity() != null) {
                return job.getRequest().getCorridor().getOriginCity();
            }
        }
        return "Ho Chi Minh City";
    }

    private String getDestinationCity(TransportJob job) {
        if (job.getRequest() != null) {
            if (job.getRequest().getDestinationPlace() != null && job.getRequest().getDestinationPlace().getCity() != null) {
                return job.getRequest().getDestinationPlace().getCity();
            }
            if (job.getRequest().getCorridor() != null && job.getRequest().getCorridor().getDestinationCity() != null) {
                return job.getRequest().getCorridor().getDestinationCity();
            }
        }
        return "Phnom Penh";
    }

    private String getBlockingReason(TransportJob job) {
        if (job.getDossierStatus() != DossierStatus.CLEARANCE_READY) {
            return "Departure locked · clearance pending";
        }
        return null;
    }

    private String getNextStepOwner(TransportJob job) {
        if (job.getStage() == JobStage.DOCUMENTS || job.getStage() == JobStage.CLEARANCE) {
            return "Lan, transport specialist";
        }
        return "Khôi, fleet & route coordinator";
    }

    private List<JobHorseResponse> getJobHorses(TransportJob job) {
        if (job.getRequest() != null && job.getRequest().getHorses() != null) {
            return job.getRequest().getHorses().stream()
                    .map(RequestHorse::getHorse)
                    .map(h -> JobHorseResponse.builder()
                            .id(h.getId())
                            .name(h.getName())
                            .sex(h.getSex())
                            .breed(h.getBreed())
                            .weightKg(h.getWeightKg())
                            .sizeClassCode(h.getSizeClass() != null ? h.getSizeClass().getCode() : "M")
                            .requiredStall(h.getRequiredStall())
                            .temperament(h.getTemperament())
                            .handlingNotes(h.getHandlingNotes())
                            .build())
                    .toList();
        }
        return Collections.emptyList();
    }
}
