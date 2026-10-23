package com.equifreight.job;

import com.equifreight.service.notification.NotificationStream;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/** Keeps the bell's open event streams alive through proxies that close idle connections (US-00-07). */
@Component
public class NotificationStreamHeartbeatJob {

    private static final long HEARTBEAT_MS = 25_000L;

    private final NotificationStream stream;

    public NotificationStreamHeartbeatJob(NotificationStream stream) {
        this.stream = stream;
    }

    @Scheduled(fixedRate = HEARTBEAT_MS)
    public void beat() {
        stream.heartbeat();
    }
}
