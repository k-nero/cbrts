package com.equifreight.job;

import com.equifreight.configuration.AppConstants;
import com.equifreight.service.DocumentReminderService;
import java.time.Clock;
import java.time.LocalDate;
import lombok.extern.log4j.Log4j2;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/**
 * US-F2-02: each morning in Vietnam, reminds clubs of documents due in 7, 3 and 1 days. The rule lives in
 * {@link DocumentReminderService}.
 */
@Log4j2
@Component
public class DocumentReminderJob {

    private final DocumentReminderService reminders;
    private final Clock clock;

    public DocumentReminderJob(DocumentReminderService reminders, Clock clock) {
        this.reminders = reminders;
        this.clock = clock;
    }

    @Scheduled(cron = "0 0 8 * * *", zone = "Asia/Ho_Chi_Minh")
    public void run() {
        int sent = reminders.remindDue(LocalDate.now(clock.withZone(AppConstants.BUSINESS_ZONE)));
        if (sent > 0) {
            log.info("Sent {} document due reminder(s)", sent);
        }
    }
}
