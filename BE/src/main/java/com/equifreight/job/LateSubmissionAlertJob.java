package com.equifreight.job;

import com.equifreight.configuration.AppConstants;
import com.equifreight.service.AuthoritySubmissionService;
import java.time.Clock;
import java.time.LocalDate;
import lombok.extern.log4j.Log4j2;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/**
 * US-F2-07: each morning in Vietnam, alerts the logistics manager about authority submissions still waiting
 * past the day the authority was expected to answer. The rule lives in {@link AuthoritySubmissionService}.
 */
@Log4j2
@Component
public class LateSubmissionAlertJob {

    private final AuthoritySubmissionService submissions;
    private final Clock clock;

    public LateSubmissionAlertJob(AuthoritySubmissionService submissions, Clock clock) {
        this.submissions = submissions;
        this.clock = clock;
    }

    @Scheduled(cron = "0 0 8 * * *", zone = "Asia/Ho_Chi_Minh")
    public void run() {
        int alerted = submissions.alertLateSubmissions(LocalDate.now(clock.withZone(AppConstants.BUSINESS_ZONE)));
        if (alerted > 0) {
            log.info("Alerted on {} late authority submission(s)", alerted);
        }
    }
}
