package com.equifreight.service.notification;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.spy;
import static org.mockito.Mockito.verify;

import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

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
}
