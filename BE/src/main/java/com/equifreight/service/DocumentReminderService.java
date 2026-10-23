package com.equifreight.service;

import com.equifreight.entity.ChecklistItem;
import com.equifreight.entity.TransportJob;
import com.equifreight.entity.enums.NotificationKind;
import com.equifreight.repository.ChecklistItemRepository;
import com.equifreight.service.notification.Audience;
import com.equifreight.service.notification.Subject;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.time.temporal.ChronoUnit;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.stream.Collectors;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * US-F2-02: reminds a club of the documents it still owes 7, 3 and 1 days before each is due. One notice per job and
 * due day lists every document due that day, so four horses' boosters make one row, not four.
 */
@Service
public class DocumentReminderService {

    /** Days before the due date that a reminder goes out (T-7, T-3, T-1). */
    static final List<Integer> DAYS_BEFORE = List.of(7, 3, 1);

    private static final DateTimeFormatter DAY = DateTimeFormatter.ofPattern("d MMM", Locale.ENGLISH);

    private final ChecklistItemRepository checklistItems;
    private final NotificationService notifications;

    public DocumentReminderService(ChecklistItemRepository checklistItems, NotificationService notifications) {
        this.checklistItems = checklistItems;
        this.notifications = notifications;
    }

    /** Sends today's reminders and returns how many notices went out (one per job and due day). */
    @Transactional
    public int remindDue(LocalDate today) {
        List<LocalDate> days = DAYS_BEFORE.stream().map(today::plusDays).toList();
        Map<TransportJob, Map<LocalDate, List<ChecklistItem>>> owed =
                checklistItems.findOwedByCustomerDueOn(days).stream()
                        .collect(Collectors.groupingBy(
                                ChecklistItem::getJob,
                                LinkedHashMap::new,
                                Collectors.groupingBy(
                                        ChecklistItem::getDueDate, LinkedHashMap::new, Collectors.toList())));
        int sent = 0;
        for (var byJob : owed.entrySet()) {
            TransportJob job = byJob.getKey();
            for (var byDay : byJob.getValue().entrySet()) {
                remind(job, byDay.getKey(), byDay.getValue(), today);
                sent++;
            }
        }
        return sent;
    }

    private void remind(TransportJob job, LocalDate due, List<ChecklistItem> items, LocalDate today) {
        long daysLeft = ChronoUnit.DAYS.between(today, due);
        String when = daysLeft == 1 ? "tomorrow" : "in " + daysLeft + " days";
        String title = items.size() == 1
                ? items.getFirst().getDocumentType().getName() + " for " + job.getCode() + " is due " + when
                : items.size() + " documents for " + job.getCode() + " are due " + when;
        String body = "Due " + due.format(DAY) + ": "
                + items.stream().map(DocumentReminderService::label).collect(Collectors.joining(", "))
                + ". Upload " + (items.size() == 1 ? "it" : "them") + " on the request's documents page.";
        notifications.notify(
                NotificationKind.DOCUMENTS_DUE,
                Audience.club(job.getRequest().getClub().getId()),
                Subject.documents(job),
                title,
                body,
                // T-3 replaces an unread T-7 for the same day; once read, the next reminder is a new row.
                "DOCUMENTS_DUE:" + job.getId() + ":" + due);
    }

    /** "Silver Bell · Influenza vaccination", or "Shipment · Transit insurance" for the job's own papers. */
    private static String label(ChecklistItem item) {
        String owner = item.getHorse() != null ? item.getHorse().getName() : "Shipment";
        return owner + " · " + item.getDocumentType().getName();
    }
}
