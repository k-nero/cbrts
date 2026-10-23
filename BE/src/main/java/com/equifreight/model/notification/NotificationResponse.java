package com.equifreight.model.notification;

import com.equifreight.entity.enums.NotificationKind;
import com.equifreight.entity.enums.NotificationSubject;
import com.equifreight.entity.enums.NotificationTone;
import java.time.Instant;
import java.util.UUID;
import lombok.Builder;

/** One row of the notification centre. {@code linkPath} is the page the signed-in user opens the record on. */
@Builder
public record NotificationResponse(
        UUID id,
        NotificationKind kind,
        NotificationTone tone,
        String title,
        String body,
        NotificationSubject entityType,
        String entityCode,
        String linkPath,
        Instant createdAt,
        Instant readAt) {}
