package com.equifreight.controller;

import com.equifreight.entity.User;
import com.equifreight.model.notification.NotificationResponse;
import com.equifreight.model.notification.ReadAllResponse;
import com.equifreight.model.notification.UnreadCountResponse;
import com.equifreight.service.NotificationService;
import com.equifreight.service.notification.NotificationStream;
import io.swagger.v3.oas.annotations.Operation;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

/** The signed-in user's notification centre (US-00-07). Every role has one, and it only ever shows their own rows. */
@RestController
@RequestMapping("/api/v1/me/notifications")
public class MeNotificationController {

    private final NotificationService notifications;
    private final NotificationStream stream;

    public MeNotificationController(NotificationService notifications, NotificationStream stream) {
        this.notifications = notifications;
        this.stream = stream;
    }

    /**
     * Server-sent events: a {@code changed} event whenever my notifications change, so the bell refetches. Sent with
     * the bearer token like any other call (the client reads it with fetch, not EventSource, which can't set headers).
     */
    @Operation(summary = "Stream changes to my notifications")
    @GetMapping(path = "/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public ResponseEntity<SseEmitter> stream(@AuthenticationPrincipal User me) {
        return ResponseEntity.ok()
                .header(HttpHeaders.CACHE_CONTROL, "no-cache")
                // nginx buffers proxied responses unless told not to; events must reach the tab at once.
                .header("X-Accel-Buffering", "no")
                .body(stream.open(me.getId()));
    }

    @Operation(summary = "List my notifications, newest first")
    @GetMapping
    public Page<NotificationResponse> list(
            @AuthenticationPrincipal User me,
            @RequestParam(defaultValue = "false") boolean unread,
            @PageableDefault(size = 20, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable) {
        return notifications.list(me, unread, pageable);
    }

    @Operation(summary = "Count my unread notifications")
    @GetMapping("/unread-count")
    public UnreadCountResponse unreadCount(@AuthenticationPrincipal User me) {
        return notifications.unreadCount(me);
    }

    @Operation(summary = "Mark one of my notifications as read")
    @PostMapping("/{id}/read")
    public ResponseEntity<Void> markRead(@AuthenticationPrincipal User me, @PathVariable UUID id) {
        notifications.markRead(me, id);
        return ResponseEntity.noContent().build();
    }

    @Operation(summary = "Mark all my notifications as read")
    @PostMapping("/read-all")
    public ReadAllResponse markAllRead(@AuthenticationPrincipal User me) {
        return notifications.markAllRead(me);
    }
}
