package com.equifreight.job;

import com.equifreight.entity.Handover;
import com.equifreight.repository.HandoverRepository;
import com.equifreight.service.HandoverService;
import java.time.Clock;
import lombok.extern.log4j.Log4j2;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/**
 * A handover the customer hasn't answered within 2 days is taken as accepted (US-F6-02, DESIGN.md "Handover"). Every
 * hour this finds the ones past due and hands each to {@link HandoverService#acceptByDefault}, which waits while an
 * incident on the job is still open.
 */
@Log4j2
@Component
public class HandoverConfirmationJob {

    private static final long ONE_HOUR_MS = 3_600_000L;

    private final HandoverRepository handovers;
    private final HandoverService service;
    private final Clock clock;

    public HandoverConfirmationJob(HandoverRepository handovers, HandoverService service, Clock clock) {
        this.handovers = handovers;
        this.service = service;
        this.clock = clock;
    }

    @Scheduled(fixedDelay = ONE_HOUR_MS)
    public void run() {
        for (Handover due :
                handovers.findByHandedOverAtIsNotNullAndCustomerOutcomeIsNullAndConfirmDueAtBefore(clock.instant())) {
            try {
                service.acceptByDefault(due.getId());
            } catch (RuntimeException e) {
                log.warn(
                        "Handover of job {} not taken as accepted: {}",
                        due.getJob().getId(),
                        e.getMessage());
            }
        }
    }
}
