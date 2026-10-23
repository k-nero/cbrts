package com.equifreight.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.equifreight.entity.ChecklistItem;
import com.equifreight.entity.Club;
import com.equifreight.entity.DocumentType;
import com.equifreight.entity.Horse;
import com.equifreight.entity.TransportJob;
import com.equifreight.entity.TransportRequest;
import com.equifreight.entity.enums.NotificationKind;
import com.equifreight.repository.ChecklistItemRepository;
import com.equifreight.service.notification.Audience;
import com.equifreight.service.notification.Subject;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

/** US-F2-02: reminders 7, 3 and 1 days before a document the club owes is due. */
class DocumentReminderServiceTest {

    static final LocalDate TODAY = LocalDate.parse("2026-10-04");

    ChecklistItemRepository items;
    NotificationService notifications;
    DocumentReminderService service;
    TransportJob job;
    Club club;

    @BeforeEach
    void setUp() {
        items = mock(ChecklistItemRepository.class);
        notifications = mock(NotificationService.class);
        service = new DocumentReminderService(items, notifications);
        club = new Club();
        club.setId(UUID.randomUUID());
        TransportRequest request = new TransportRequest();
        request.setId(UUID.randomUUID());
        request.setClub(club);
        job = new TransportJob();
        job.setId(UUID.randomUUID());
        job.setCode("CBRT-2026-041");
        job.setRequest(request);
    }

    ChecklistItem owed(String horse, String document, LocalDate due) {
        DocumentType type = new DocumentType();
        type.setName(document);
        ChecklistItem item = new ChecklistItem();
        item.setJob(job);
        item.setDocumentType(type);
        if (horse != null) {
            Horse h = new Horse();
            h.setName(horse);
            item.setHorse(h);
        }
        item.setDueDate(due);
        return item;
    }

    @Test
    void asksForWhatIsDueSevenThreeAndOneDaysAhead() {
        when(items.findOwedByCustomerDueOn(any())).thenReturn(List.of());

        service.remindDue(TODAY);

        verify(items).findOwedByCustomerDueOn(List.of(TODAY.plusDays(7), TODAY.plusDays(3), TODAY.plusDays(1)));
        verify(notifications, never()).notify(any(), any(), any(), any(), any(), any());
    }

    @Test
    void documentsDueTheSameDayMakeOneNoticeForTheClub() {
        LocalDate due = TODAY.plusDays(3);
        when(items.findOwedByCustomerDueOn(any()))
                .thenReturn(List.of(
                        owed("Silver Bell", "Influenza vaccination", due), owed(null, "Transit insurance", due)));

        assertThat(service.remindDue(TODAY)).isEqualTo(1);

        verify(notifications)
                .notify(
                        NotificationKind.DOCUMENTS_DUE,
                        Audience.club(club.getId()),
                        Subject.documents(job),
                        "2 documents for CBRT-2026-041 are due in 3 days",
                        "Due 7 Oct: Silver Bell · Influenza vaccination, Shipment · Transit insurance."
                                + " Upload them on the request's documents page.",
                        "DOCUMENTS_DUE:" + job.getId() + ":2026-10-07");
    }

    @Test
    void eachDueDayGetsItsOwnNoticeAndTheLastSaysTomorrow() {
        when(items.findOwedByCustomerDueOn(any()))
                .thenReturn(List.of(
                        owed("Nightfall", "EIA (Coggins) test", TODAY.plusDays(1)),
                        owed("Silver Bell", "Proof of ownership", TODAY.plusDays(7))));

        assertThat(service.remindDue(TODAY)).isEqualTo(2);

        verify(notifications)
                .notify(
                        eq(NotificationKind.DOCUMENTS_DUE),
                        any(),
                        any(),
                        eq("EIA (Coggins) test for CBRT-2026-041 is due tomorrow"),
                        eq("Due 5 Oct: Nightfall · EIA (Coggins) test. Upload it on the request's documents page."),
                        eq("DOCUMENTS_DUE:" + job.getId() + ":2026-10-05"));
        verify(notifications)
                .notify(
                        any(),
                        any(),
                        any(),
                        eq("Proof of ownership for CBRT-2026-041 is due in 7 days"),
                        any(),
                        eq("DOCUMENTS_DUE:" + job.getId() + ":2026-10-11"));
    }
}
