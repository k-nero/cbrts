package com.equifreight.model.home;

import com.equifreight.entity.ChecklistItem;
import com.equifreight.entity.Horse;
import com.equifreight.entity.Quotation;
import com.equifreight.entity.TransportRequest;
import java.time.Instant;
import java.util.Locale;

/** Turns the club's requests, documents and horses into the Home's parts; the wording is worked out by the caller. */
public final class HomeMapper {

    private HomeMapper() {}

    public static OwedEntryResponse toDocumentOwed(
            ChecklistItem item, String urgency, String title, String subject, String reason, Instant dueAt) {
        return OwedEntryResponse.builder()
                .id(item.getId().toString())
                .kind("DOCUMENT")
                .requestId(item.getJob().getRequest().getId())
                .itemId(item.getId())
                .urgency(urgency)
                .title(title)
                .subject(subject)
                .reason(reason)
                .dueAt(dueAt)
                .actionLabel("Upload document")
                .actionIcon("upload")
                .build();
    }

    public static OwedEntryResponse toQuotationOwed(
            Quotation q, String urgency, String title, String subject, String reason) {
        return OwedEntryResponse.builder()
                .id(q.getId().toString())
                .kind("QUOTATION")
                .requestId(q.getRequest().getId())
                .urgency(urgency)
                .title(title)
                .subject(subject)
                .reason(reason)
                .dueAt(q.getValidUntil())
                .actionLabel("Open quotation")
                .build();
    }

    public static OwedEntryResponse toRequoteOwed(
            Quotation expired, String urgency, String title, String subject, String reason, Instant dueAt) {
        return OwedEntryResponse.builder()
                .id(expired.getId().toString())
                .kind("QUOTATION")
                .requestId(expired.getRequest().getId())
                .urgency(urgency)
                .title(title)
                .subject(subject)
                .reason(reason)
                .dueAt(dueAt)
                .actionLabel("Ask for a re-quote")
                .build();
    }

    public static OwedEntryResponse toAnswerOwed(TransportRequest r, String urgency, String subject, String reason) {
        return OwedEntryResponse.builder()
                .id(r.getId().toString())
                .kind("ANSWER")
                .requestId(r.getId())
                .urgency(urgency)
                .title("Answer the logistics manager's note")
                .subject(subject)
                .reason(reason)
                .actionLabel("Answer")
                .build();
    }

    public static MoveEntryResponse toMove(
            TransportRequest r,
            String route,
            String detail,
            String stage,
            TonedTextResponse holds,
            Instant departsAt,
            Instant arrivesAt) {
        return MoveEntryResponse.builder()
                .requestId(r.getId())
                .requestCode(r.getCode())
                .status(r.getStatus())
                .route(route)
                .detail(detail)
                .stage(stage)
                .holds(holds)
                .departsAt(departsAt)
                .arrivesAt(arrivesAt)
                .build();
    }

    public static HomeHorseResponse toHorse(Horse h, String line, String documents, TonedTextResponse note) {
        return HomeHorseResponse.builder()
                .id(h.getId())
                .name(h.getName())
                .coat(h.getCoat() == null ? "other" : h.getCoat().name().toLowerCase(Locale.ROOT))
                .line(line)
                .documents(documents)
                .note(note)
                .build();
    }
}
