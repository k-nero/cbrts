package com.equifreight.service;

import com.equifreight.entity.CrewAssignment;
import com.equifreight.entity.RequestHorse;
import com.equifreight.entity.TransportJob;
import com.equifreight.entity.User;
import com.equifreight.entity.enums.CrewRole;
import com.equifreight.exception.BusinessException;
import com.equifreight.exception.ResourceNotFoundException;
import com.equifreight.model.job.AssignCrewRequest;
import com.equifreight.model.job.CrewMemberResponse;
import com.equifreight.repository.AuditLogRepository;
import com.equifreight.repository.CrewAssignmentRepository;
import com.equifreight.repository.TransportJobRepository;
import com.equifreight.repository.UserRepository;
import lombok.extern.log4j.Log4j2;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Service
@Log4j2
public class CrewAssignmentService {

    private final CrewAssignmentRepository crewAssignmentRepository;
    private final TransportJobRepository transportJobRepository;
    private final UserRepository userRepository;
    private final AuditLogRepository auditLogRepository;

    public CrewAssignmentService(CrewAssignmentRepository crewAssignmentRepository,
                                 TransportJobRepository transportJobRepository,
                                 UserRepository userRepository,
                                 AuditLogRepository auditLogRepository) {
        this.crewAssignmentRepository = crewAssignmentRepository;
        this.transportJobRepository = transportJobRepository;
        this.userRepository = userRepository;
        this.auditLogRepository = auditLogRepository;
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

        crewAssignmentRepository.deleteByJobId(jobId);

        List<CrewAssignment> assignments = new ArrayList<>();
        for (AssignCrewRequest.CrewItem item : request.getCrew()) {
            User user = userRepository.findById(item.getUserId())
                    .orElseThrow(() -> new ResourceNotFoundException("User not found: " + item.getUserId()));

            CrewAssignment ca = new CrewAssignment();
            ca.setJob(job);
            ca.setUser(user);
            ca.setCrewRole(item.getCrewRole());
            ca.getId().setJobId(job.getId());
            ca.getId().setUserId(user.getId());
            assignments.add(crewAssignmentRepository.save(ca));
        }

        log.info("Assigned {} crew members to job {}", assignments.size(), job.getCode());
        return assignments.stream().map(this::toResponse).toList();
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
