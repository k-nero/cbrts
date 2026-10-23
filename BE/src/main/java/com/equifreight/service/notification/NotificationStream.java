package com.equifreight.service.notification;

import java.io.IOException;
import java.time.Duration;
import java.util.Collection;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import lombok.extern.log4j.Log4j2;
import org.springframework.stereotype.Component;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

/**
 * Live updates for the bell (US-00-07): each signed-in tab holds one server-sent event stream, and a user's tabs are
 * told when their notifications change, so they refetch instead of polling. The event carries no content; the
 * notifications API stays the only way to read them.
 *
 * <p>The streams live in this instance's memory. Running more than one backend would need a shared channel (Postgres
 * {@code LISTEN/NOTIFY}) to reach a tab connected to another instance.
 */
@Log4j2
@Component
public class NotificationStream {

    /** The browser reconnects when a stream ends, so a stream that outlives a token's life is simply reopened. */
    static final long TIMEOUT_MS = Duration.ofMinutes(30).toMillis();

    static final String CHANGED = "changed";

    private final Map<UUID, Set<SseEmitter>> streams = new ConcurrentHashMap<>();

    public SseEmitter open(UUID userId) {
        SseEmitter emitter = new SseEmitter(TIMEOUT_MS);
        streams.computeIfAbsent(userId, id -> ConcurrentHashMap.newKeySet()).add(emitter);
        Runnable close = () -> remove(userId, emitter);
        emitter.onCompletion(close);
        emitter.onTimeout(close);
        emitter.onError(error -> close.run());
        // The first event sends the headers at once, so the browser knows the stream is open.
        send(userId, emitter, SseEmitter.event().name("ready").data(""));
        return emitter;
    }

    /**
     * Tells the users' open tabs that their notifications changed, once the caller's transaction commits: a tab must
     * not refetch before the rows are visible, nor hear about a change that was rolled back.
     */
    public void changedAfterCommit(Collection<UUID> userIds) {
        List<UUID> ids = List.copyOf(userIds);
        if (ids.isEmpty()) {
            return;
        }
        if (!TransactionSynchronizationManager.isSynchronizationActive()) {
            publish(ids);
            return;
        }
        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            @Override
            public void afterCommit() {
                publish(ids);
            }
        });
    }

    /** A comment line every few seconds keeps proxies (nginx closes an idle upstream after 60 s) from cutting a stream. */
    public void heartbeat() {
        streams.forEach((userId, emitters) ->
                emitters.forEach(e -> send(userId, e, SseEmitter.event().comment("ping"))));
    }

    int openStreams(UUID userId) {
        return streams.getOrDefault(userId, Set.of()).size();
    }

    void publish(Collection<UUID> userIds) {
        for (UUID userId : userIds) {
            for (SseEmitter emitter : streams.getOrDefault(userId, Set.of())) {
                send(userId, emitter, SseEmitter.event().name(CHANGED).data(""));
            }
        }
    }

    private void send(UUID userId, SseEmitter emitter, SseEmitter.SseEventBuilder event) {
        try {
            emitter.send(event);
        } catch (IOException | IllegalStateException e) {
            // The tab went away; its browser opens a new stream when it comes back.
            log.debug("Dropping a closed notification stream for user {}", userId);
            remove(userId, emitter);
            emitter.completeWithError(e);
        }
    }

    private void remove(UUID userId, SseEmitter emitter) {
        streams.computeIfPresent(userId, (id, emitters) -> {
            emitters.remove(emitter);
            return emitters.isEmpty() ? null : emitters;
        });
    }
}
