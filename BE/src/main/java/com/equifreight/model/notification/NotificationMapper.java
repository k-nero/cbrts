package com.equifreight.model.notification;

import com.equifreight.entity.Notification;

public final class NotificationMapper {
    private NotificationMapper() {}

    public static NotificationResponse toResponse(Notification notification) {
        return NotificationResponse.builder()
                .id(notification.getId())
                .kind(notification.getKind())
                .tone(notification.getKind().tone())
                .title(notification.getTitle())
                .body(notification.getBody())
                .entityType(notification.getEntityType())
                .entityCode(notification.getEntityCode())
                .linkPath(notification.getLinkPath())
                .createdAt(notification.getCreatedAt())
                .readAt(notification.getReadAt())
                .build();
    }
}
