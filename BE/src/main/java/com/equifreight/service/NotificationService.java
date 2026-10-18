package com.equifreight.service;

import com.equifreight.entity.Notification;
import com.equifreight.entity.User;
import com.equifreight.repository.NotificationRepository;
import java.time.Instant;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class NotificationService {

    private final NotificationRepository notificationRepository;

    public NotificationService(NotificationRepository notificationRepository) {
        this.notificationRepository = notificationRepository;
    }

    @Transactional
    public Notification sendNotification(
            User recipient, String kind, String title, String body, String entityType, UUID entityId) {
        if (recipient == null) {
            return null;
        }

        Notification notification = new Notification();
        notification.setUser(recipient);
        notification.setKind(kind);
        notification.setTitle(title);
        notification.setBody(body);
        notification.setEntityType(entityType);
        notification.setEntityId(entityId);
        notification.setCreatedAt(Instant.now());

        return notificationRepository.save(notification);
    }
}
