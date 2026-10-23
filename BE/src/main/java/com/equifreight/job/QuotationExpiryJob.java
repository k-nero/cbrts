package com.equifreight.job;

import com.equifreight.configuration.BusinessTime;
import com.equifreight.entity.Quotation;
import com.equifreight.entity.TransportRequest;
import com.equifreight.entity.User;
import com.equifreight.entity.enums.QuotationStatus;
import com.equifreight.entity.enums.RequestStatus;
import com.equifreight.repository.QuotationRepository;
import com.equifreight.repository.TransportRequestRepository;
import com.equifreight.repository.UserRepository;
import com.equifreight.service.AuditService;
import com.equifreight.service.NotificationService;
import jakarta.persistence.EntityManager;
import jakarta.persistence.LockModeType;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import lombok.extern.log4j.Log4j2;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/**
 * A quotation holds its price until the end of its last valid day (BR-F1-03). Every hour this expires the issued
 * quotations past that point, with their quoted requests (Flow 1 A4), and reminds the club of any that expire within a
 * day. Expiry runs first, so a quotation already overdue is never reminded.
 */
@Log4j2
@Component
public class QuotationExpiryJob {

    private static final long ONE_HOUR_MS = 3_600_000L;
    private static final String ENTITY_TYPE = "TRANSPORT_REQUEST";

    private final QuotationRepository quotations;
    private final TransportRequestRepository requests;
    private final UserRepository users;
    private final NotificationService notifications;
    private final AuditService audit;
    private final EntityManager entities;
    private final Clock clock;

    public QuotationExpiryJob(
            QuotationRepository quotations,
            TransportRequestRepository requests,
            UserRepository users,
            NotificationService notifications,
            AuditService audit,
            EntityManager entities,
            Clock clock) {
        this.quotations = quotations;
        this.requests = requests;
        this.users = users;
        this.notifications = notifications;
        this.audit = audit;
        this.entities = entities;
        this.clock = clock;
    }

    @Scheduled(fixedDelay = ONE_HOUR_MS)
    @Transactional
    public void run() {
        Instant now = clock.instant();
        int expired = 0;
        for (Quotation q : quotations.findByStatusAndValidUntilBefore(QuotationStatus.ISSUED, now)) {
            if (stillIssuedBefore(q, now)) {
                expire(q);
                expired++;
            }
        }
        Instant soon = now.plus(Duration.ofHours(24));
        for (Quotation q :
                quotations.findByStatusAndReminderSentAtIsNullAndValidUntilBefore(QuotationStatus.ISSUED, soon)) {
            if (stillIssuedBefore(q, soon)
                    && q.getReminderSentAt() == null
                    && q.getRequest().getStatus() == RequestStatus.QUOTED) {
                remind(q, now);
            }
        }
        if (expired > 0) {
            log.info("Expired {} quotation(s)", expired);
        }
    }

    /**
     * Locks the request row (the order every staff write takes) and reads the quotation again: a manager may have
     * issued the next version, which supersedes this one, between the job's read and now.
     */
    private boolean stillIssuedBefore(Quotation q, Instant before) {
        entities.refresh(q.getRequest(), LockModeType.PESSIMISTIC_WRITE);
        entities.refresh(q);
        return q.getStatus() == QuotationStatus.ISSUED && q.getValidUntil().isBefore(before);
    }

    private void expire(Quotation q) {
        q.setStatus(QuotationStatus.EXPIRED);
        quotations.save(q);
        TransportRequest request = q.getRequest();
        RequestStatus before = request.getStatus();
        if (before == RequestStatus.QUOTED) {
            request.setStatus(RequestStatus.EXPIRED);
            requests.save(request);
        }
        audit.recordSystem(
                "QUOTATION_EXPIRED",
                "Quotation " + q.getCode() + " v" + q.getVersionNo() + " expired on " + day(q.getValidUntil()),
                ENTITY_TYPE,
                request.getId(),
                request.getCode(),
                "{\"status\":\"" + before + "\"}",
                "{\"status\":\"" + request.getStatus() + "\"}");
        if (before != RequestStatus.QUOTED) {
            // A cancelled request has no quotation left to re-price; the club isn't told it expired.
            return;
        }
        String manager = q.getPreparedBy() == null
                ? "The logistics manager"
                : q.getPreparedBy().displayName();
        notify(
                request,
                "QUOTATION_EXPIRED",
                "Quotation " + q.getCode() + " has expired",
                manager + " can re-price it from the rate catalog in force now.");
    }

    private void remind(Quotation q, Instant now) {
        q.setReminderSentAt(now);
        quotations.save(q);
        notify(
                q.getRequest(),
                "QUOTATION_EXPIRING",
                "Quotation " + q.getCode() + " v" + q.getVersionNo() + " expires within a day",
                "It holds its price until " + day(q.getValidUntil()) + ".");
    }

    private void notify(TransportRequest request, String kind, String title, String body) {
        for (User account : users.findByClubId(request.getClub().getId())) {
            notifications.sendNotification(account, kind, title, body, ENTITY_TYPE, request.getId());
        }
    }

    private static String day(Instant instant) {
        return BusinessTime.DAY.format(instant.atZone(BusinessTime.ZONE));
    }
}
