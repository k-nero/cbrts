package com.equifreight.model.approval;

import com.equifreight.entity.TransportJob;
import com.equifreight.entity.User;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/** Approval to its responses: the team to choose from, and the job a request became. */
public final class ApprovalMapper {

    private ApprovalMapper() {}

    /**
     * @param specialistJobs open jobs per transport specialist id; a missing id has none
     * @param coordinatorJobs open jobs per coordinator id
     */
    public static ApprovalOptionsResponse toOptions(
            List<User> specialists,
            Map<UUID, Long> specialistJobs,
            List<User> coordinators,
            Map<UUID, Long> coordinatorJobs) {
        List<ApprovalOptionsResponse.TeamMember> s = members(specialists, specialistJobs);
        List<ApprovalOptionsResponse.TeamMember> c = members(coordinators, coordinatorJobs);
        return ApprovalOptionsResponse.builder()
                .specialists(s)
                .coordinators(c)
                .suggestedSpecialistId(s.isEmpty() ? null : s.getFirst().id())
                .suggestedCoordinatorId(c.isEmpty() ? null : c.getFirst().id())
                .build();
    }

    public static JobRefResponse toJobRef(TransportJob job) {
        return JobRefResponse.builder()
                .id(job.getId())
                .code(job.getCode())
                .transportSpecialist(
                        job.getTransportSpecialist() == null
                                ? null
                                : job.getTransportSpecialist().displayName())
                .coordinator(
                        job.getCoordinator() == null
                                ? null
                                : job.getCoordinator().displayName())
                .build();
    }

    /** Fewest open jobs first, then by name, so the suggestion is stable. */
    private static List<ApprovalOptionsResponse.TeamMember> members(List<User> people, Map<UUID, Long> jobs) {
        return people.stream()
                .map(u -> new ApprovalOptionsResponse.TeamMember(
                        u.getId(), u.displayName(), jobs.getOrDefault(u.getId(), 0L)))
                .sorted(Comparator.comparingLong(ApprovalOptionsResponse.TeamMember::openJobs)
                        .thenComparing(ApprovalOptionsResponse.TeamMember::name))
                .toList();
    }
}
