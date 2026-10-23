package com.equifreight.service.notification;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.spy;
import static org.mockito.Mockito.verify;

import java.io.IOException;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

/** US-00-07: open tabs hear about a change only once it is committed. */
class NotificationStreamTest {

    NotificationStream stream = spy(new NotificationStream());
    UUID yen = UUID.randomUUID();

    @AfterEach
    void clearSynchronization() {
        if (TransactionSynchronizationManager.isSynchronizationActive()) {
            TransactionSynchronizationManager.clearSynchronization();
        }
    }

    @Test
    void insideATransactionTabsAreToldAfterCommit() {
        TransactionSynchronizationManager.initSynchronization();

        stream.changedAfterCommit(List.of(yen));

        verify(stream, never()).publish(List.of(yen));
        TransactionSynchronizationManager.getSynchronizations().forEach(TransactionSynchronization::afterCommit);
        verify(stream).publish(List.of(yen));
    }

    @Test
    void aRolledBackChangeIsNeverPublished() {
        TransactionSynchronizationManager.initSynchronization();

        stream.changedAfterCommit(List.of(yen));
        TransactionSynchronizationManager.getSynchronizations()
                .forEach(s -> s.afterCompletion(TransactionSynchronization.STATUS_ROLLED_BACK));

        verify(stream, never()).publish(List.of(yen));
    }

    @Test
    void eachTabOfAUserHoldsItsOwnStream() {
        stream.open(yen);
        stream.open(yen);

        assertThat(stream.openStreams(yen)).isEqualTo(2);
        assertThat(stream.openStreams(UUID.randomUUID())).isZero();
    }

    @Test
    void aTabThatAlreadyFailedDoesNotFailTheChangeThatPublished() {
        // The container ended this tab's stream on an error: sending fails, and so does completing it.
        SseEmitter dead = new SseEmitter() {
            @Override
            public void send(SseEventBuilder builder) throws IOException {
                throw new IOException("Broken pipe");
            }

            @Override
            public void completeWithError(Throwable ex) {
                throw new IllegalStateException("AsyncContext already failed");
            }
        };
        stream.register(yen, dead);
        TransactionSynchronizationManager.initSynchronization();
        stream.changedAfterCommit(List.of(yen));

        assertThatCode(() -> TransactionSynchronizationManager.getSynchronizations()
                        .forEach(TransactionSynchronization::afterCommit))
                .doesNotThrowAnyException();
        assertThat(stream.openStreams(yen)).isZero();
    }
}
