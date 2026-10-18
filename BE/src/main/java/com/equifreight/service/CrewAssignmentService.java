package com.equifreight.service;

import com.equifreight.entity.CrewAssignment;
import com.equifreight.entity.TransportJob;
import com.equifreight.entity.User;
import com.equifreight.entity.enums.CrewRole;
import com.equifreight.exception.BusinessException;
import com.equifreight.exception.ResourceNotFoundException;
import com.equifreight.model.job.AssignCrewRequest;
import com.equifreight.model.job.CrewMemberResponse;
import com.equifreight.repository.CrewAssignmentRepository;
import com.equifreight.repository.TransportJobRepository;
import com.equifreight.repository.UserRepository;
import lombok.extern.log4j.Log4j2;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;

@Service
@Log4j2
public class CrewAssignmentService {

    private final CrewAssignmentRepository crewAssignmentRepository;
    private final TransportJobRepository transportJobRepository;
    private final UserRepository userRepository;
    private final AuditService auditService;

    public CrewAssignmentService(CrewAssignmentRepository crewAssignmentRepository,
                                 TransportJobRepository transportJobRepository,
                                 UserRepository userRepository,
                                 AuditService auditService) {
        this.crewAssignmentRepository = crewAssignmentRepository;
        this.transportJobRepository = transportJobRepository;
        this.userRepository = userRepository;
        this.auditService = auditService;
    }

    @Transactional(readOnly = true)
    public List<CrewMemberResponse> getCrew(UUID jobId) {
        return crewAssignmentRepository.findByJobId(jobId).stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional
    public List<CrewMemberResponse> assignCrew(UUID jobId, AssignCrewRequest request, User currentUser) {
        TransportJob job = transportJobRepository.findById(jobId)
                .orElseThrow(() -> new ResourceNotFoundException("Job not found: " + jobId));

        // The crew can change until departure; a change after sign-off clears it, so it needs a new one (US-F3-08).
        if (job.getDepartedAt() != null) {
            throw new BusinessException("Cannot modify crew assignments: the job departed on " + job.getDepartedAt());
        }

        // Duplicate check
        Set<UUID> seenUserIds = new HashSet<>();
        for (AssignCrewRequest.CrewItem item : request.getCrew()) {
            if (!seenUserIds.add(item.getUserId())) {
                throw new BusinessException("Duplicate crew member in assignment: " + item.getUserId());
            }
        }

        int horseCount = 0;
        if (job.getRequest() != null && job.getRequest().getHorses() != null) {
            horseCount = job.getRequest().getHorses().size();
        }

        // BR: Grooms = ⌈horses ÷ 3⌉
        int requiredGrooms = (int) Math.ceil(horseCount / 3.0);
        long groomCount = request.getCrew().stream()
                .filter(c -> c.getCrewRole() == CrewRole.GROOM || c.getCrewRole() == CrewRole.FLYING_GROOM)
                .count();

        if (groomCount < requiredGrooms) {
            throw new BusinessException("At least " + requiredGrooms + " groom(s) required for " + horseCount + " horses (1 per 3 horses, rounded up). Found " + groomCount);
        }

        // Overlaps can only be checked once the confirmed route has set the travel dates; until then they are
        // checked again at sign-off (TransportJobService.signOffTripPlan).
        java.time.Instant startsAt = job.getPlannedDepartureAt();
        java.time.Instant endsAt = job.getPlannedArrivalAt();
        boolean datesKnown = startsAt != null && endsAt != null;

        List<CrewAssignment> assignments = new ArrayList<>();
        for (AssignCrewRequest.CrewItem item : request.getCrew()) {
            User user = userRepository.findById(item.getUserId())
                    .orElseThrow(() -> new ResourceNotFoundException("User not found: " + item.getUserId()));

            // Role check: User must have ESCORT role
            boolean isEscort = user.getRoles() != null && user.getRoles().stream()
                    .anyMatch(r -> "ESCORT".equalsIgnoreCase(r.getName()) || "ROLE_ESCORT".equalsIgnoreCase(r.getName()));
            if (!isEscort) {
                throw new BusinessException("User " + user.getEmail() + " does not have the ESCORT role");
            }

            // Escort kind matching check if kind is set
            if (user.getEscortKind() != null) {
                if (item.getCrewRole() == CrewRole.DRIVER && user.getEscortKind() == com.equifreight.entity.enums.EscortKind.GROOM) {
                    throw new BusinessException("User " + user.getEmail() + " is registered as a GROOM and cannot be assigned as a DRIVER");
                }
                if ((item.getCrewRole() == CrewRole.GROOM || item.getCrewRole() == CrewRole.FLYING_GROOM) && user.getEscortKind() == com.equifreight.entity.enums.EscortKind.DRIVER) {
                    throw new BusinessException("User " + user.getEmail() + " is registered as a DRIVER and cannot be assigned as a GROOM");
                }
            }

            // Overlapping jobs check (US-F3-06)
            if (datesKnown && !crewAssignmentRepository.findOverlappingAssignments(user.getId(), job.getId(), startsAt, endsAt).isEmpty()) {
                throw new com.equifreight.exception.ConflictException("CREW_OVERLAP", "Crew member " + user.getFirstName() + " " + user.getLastName() + " is already assigned to another overlapping trip");
            }

            CrewAssignment ca = new CrewAssignment();
            ca.setJob(job);
            ca.setUser(user);
            ca.setCrewRole(item.getCrewRole());
            ca.getId().setJobId(job.getId());
            ca.getId().setUserId(user.getId());
            assignments.add(ca);
        }

        crewAssignmentRepository.deleteByJobId(jobId);
        List<CrewAssignment> saved = crewAssignmentRepository.saveAll(assignments);

        // Invalidate prior sign-off when crew changes
        job.setSignedOffAt(null);
        job.setSignedOffBy(null);
        transportJobRepository.save(job);

        auditService.recordDecision(
                currentUser,
                "ASSIGN_CREW",
                "Assigned " + saved.size() + " crew members to job " + job.getCode(),
                "TRANSPORT_JOB",
                job.getId(),
                job.getCode(),
                null,
                null,
                "CREW_ASSIGNED");

        log.info("Assigned {} crew members to job {}", saved.size(), job.getCode());
        return saved.stream().map(this::toResponse).toList();
    }

    private CrewMemberResponse toResponse(CrewAssignment ca) {
        User u = ca.getUser();
        return CrewMemberResponse.builder()
                .userId(u.getId())
                .name(u.getFirstName() + " " + u.getLastName())
                .staffCode(u.getStaffCode())
                .email(u.getEmail())
                .crewRole(ca.getCrewRole())
                .build();
    }
}
