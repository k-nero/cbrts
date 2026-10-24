package com.equifreight.service;

import com.equifreight.entity.Notification;
import com.equifreight.entity.User;
import com.equifreight.entity.enums.NotificationKind;
import com.equifreight.entity.enums.RoleName;
import com.equifreight.entity.enums.UserStatus;
import com.equifreight.exception.ResourceNotFoundException;
import com.equifreight.model.notification.NotificationMapper;
import com.equifreight.model.notification.NotificationResponse;
import com.equifreight.model.notification.ReadAllResponse;
import com.equifreight.model.notification.UnreadCountResponse;
import com.equifreight.repository.NotificationRepository;
import com.equifreight.repository.UserRepository;
import com.equifreight.service.notification.Audience;
import com.equifreight.service.notification.NotificationStream;
import com.equifreight.service.notification.Subject;
import java.time.Clock;
import java.util.List;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

/**
 * The notification centre (US-00-07). A notification is a pointer to the record something happened to, written in
 * the same transaction as the change: if the change rolls back, nobody is told about it.
 */
@Service
public class NotificationService {

    static final int TITLE_MAX = 160;
    static final int BODY_MAX = 1000;

    private final NotificationRepository notifications;
    private final UserRepository users;
    private final NotificationStream stream;
    private final Clock clock;

    public NotificationService(
            NotificationRepository notifications, UserRepository users, NotificationStream stream, Clock clock) {
        this.notifications = notifications;
        this.users = users;
        this.stream = stream;
        this.clock = clock;
    }

    /** Tells everyone in the audience. The caller writes the text; the kind decides the tone. */
    @Transactional(propagation = Propagation.MANDATORY)
    public void notify(NotificationKind kind, Audience audience, Subject subject, String title, String body) {
        notify(kind, audience, subject, title, body, null);
    }

    /**
     * As {@link #notify(NotificationKind, Audience, Subject, String, String)}, but a recipient who hasn't read the
     * last notice with the same {@code dedupeKey} gets it updated and moved to the top instead of a second row.
     */
    @Transactional(propagation = Propagation.MANDATORY)
    public void notify(
            NotificationKind kind, Audience audience, Subject subject, String title, String body, String dedupeKey) {
        String link = linkFor(subject, audience);
        List<User> recipients = recipients(audience);
        for (User recipient : recipients) {
            notifications.upsert(
                    recipient.getId(),
                    kind.name(),
                    clip(title, TITLE_MAX),
                    clip(body, BODY_MAX),
                    subject.type().name(),
                    subject.id(),
                    subject.code(),
                    link,
                    dedupeKey);
        }
        stream.changedAfterCommit(recipients.stream().map(User::getId).toList());
    }

    @Transactional(readOnly = true)
    public Page<NotificationResponse> list(User me, boolean unreadOnly, Pageable pageable) {
        Page<Notification> page = unreadOnly
                ? notifications.findByUserIdAndReadAtIsNull(me.getId(), pageable)
                : notifications.findByUserId(me.getId(), pageable);
        return page.map(NotificationMapper::toResponse);
    }

    @Transactional(readOnly = true)
    public UnreadCountResponse unreadCount(User me) {
        return new UnreadCountResponse(notifications.countByUserIdAndReadAtIsNull(me.getId()));
    }

    /** Marks one of the signed-in user's notifications read; anyone else's id is not found. */
    @Transactional
    public void markRead(User me, UUID id) {
        Notification notification = notifications
                .findByIdAndUserId(id, me.getId())
                .orElseThrow(() -> ResourceNotFoundException.of("Notification", id));
        if (notification.getReadAt() == null) {
            notification.setReadAt(clock.instant());
            notifications.save(notification);
            // The user's other tabs drop their count too.
            stream.changedAfterCommit(List.of(me.getId()));
        }
    }

    @Transactional
    public ReadAllResponse markAllRead(User me) {
        int updated = notifications.markAllRead(me.getId(), clock.instant());
        if (updated > 0) {
            stream.changedAfterCommit(List.of(me.getId()));
        }
        return new ReadAllResponse(updated);
    }

    private List<User> recipients(Audience audience) {
        return switch (audience) {
            case Audience.ClubAccounts club -> users.findByClubIdAndStatusNot(club.clubId(), UserStatus.DISABLED);
            case Audience.RoleHolders holders -> users.findByRoleAndStatus(holders.role(), UserStatus.ACTIVE);
            case Audience.StaffMembers staff -> staff.users();
            case Audience.Escorts escorts -> escorts.users();
        };
    }

    /** The page each audience opens the record on. Paths match the frontend's route config. */
    static String linkFor(Subject subject, Audience audience) {
        boolean customer = audience instanceof Audience.ClubAccounts;
        boolean escort = audience instanceof Audience.Escorts
                || audience instanceof Audience.RoleHolders(String role) && RoleName.ESCORT.equals(role);
        // The customer's request page lives at /requests/{id}/submitted (it sends a draft on to the editor).
        String customerRequest = "/requests/" + subject.requestId() + "/submitted";
        return switch (subject.type()) {
            case TRANSPORT_REQUEST -> customer ? customerRequest : "/staff/requests/" + subject.requestId();
            case QUOTATION ->
                customer ? "/requests/" + subject.requestId() + "/quotation" : "/staff/requests/" + subject.requestId();
            case TRANSPORT_JOB -> customer ? customerRequest : escort ? "/escort" : "/staff/jobs/" + subject.jobId();
            case AUTHORITY_SUBMISSION ->
                customer ? customerRequest : "/staff/jobs/" + subject.jobId() + "?tab=authorities";
            case DOCUMENTS ->
                customer
                        ? "/requests/" + subject.requestId() + "/documents"
                        : "/staff/documents?jobId=" + subject.jobId();
            case INCIDENT ->
                customer ? "/tracking?job=" + subject.code() : escort ? "/escort" : "/staff/incidents/" + subject.id();
            case INVOICE ->
                customer
                        ? "/requests/" + subject.requestId() + "/invoices/" + subject.id()
                        : "/staff/invoices/" + subject.id();
            case TRIP_TRACKING ->
                customer
                        ? "/tracking?job=" + subject.code()
                        : escort ? "/escort" : "/staff/jobs/" + subject.jobId() + "?tab=trip";
        };
    }

    private static String clip(String text, int max) {
        if (text == null || text.length() <= max) {
            return text;
        }
        return text.substring(0, max - 1) + "…";
    }
}
