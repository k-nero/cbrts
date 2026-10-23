package com.equifreight.model.approval;

import java.util.List;
import java.util.UUID;
import lombok.Builder;

/**
 * Who can be put on the job at approval (US-F1-07): every active transport specialist and fleet & route coordinator,
 * with how many open jobs each already has, fewest first. The suggestion is the first of each list.
 */
@Builder
public record ApprovalOptionsResponse(
        List<TeamMember> specialists,
        List<TeamMember> coordinators,
        UUID suggestedSpecialistId,
        UUID suggestedCoordinatorId) {

    /** @param openJobs jobs not closed yet that the person is on in this role */
    public record TeamMember(UUID id, String name, long openJobs) {}
}
