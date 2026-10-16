package com.equifreight.job;

import com.equifreight.entity.StoredFile;
import com.equifreight.exception.StorageException;
import com.equifreight.repository.StoredFileRepository;
import com.equifreight.service.storage.LocalFileStorage;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.SimpleTransactionStatus;
import org.springframework.transaction.support.TransactionTemplate;

import java.nio.file.Path;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.spy;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class OrphanFileCleanupJobTest {

    @TempDir
    Path dir;

    private StoredFileRepository repository;
    private LocalFileStorage storage;
    private OrphanFileCleanupJob job;

    @BeforeEach
    void setUp() {
        repository = mock(StoredFileRepository.class);
        // A spy, so a test can make deletes fail.
        storage = spy(new LocalFileStorage(dir));
        PlatformTransactionManager transactions = mock(PlatformTransactionManager.class);
        when(transactions.getTransaction(any())).thenReturn(new SimpleTransactionStatus());
        job = new OrphanFileCleanupJob(repository, storage, new TransactionTemplate(transactions));
    }

    @Test
    void removesTheRowAndThenTheBytes() {
        StoredFile orphan = stored();
        when(repository.findOrphans(any(), anyInt())).thenReturn(List.of(orphan));

        job.removeOrphans();

        verify(repository).deleteNow(orphan.getId());
        assertThat(dir.resolve(orphan.getStorageKey())).doesNotExist();
    }

    @Test
    void keepsTheBytesWhenSomethingStillReferencesTheRow() {
        StoredFile referenced = stored();
        when(repository.findOrphans(any(), anyInt())).thenReturn(List.of(referenced));
        when(repository.deleteNow(referenced.getId())).thenThrow(new DataIntegrityViolationException("fk"));

        job.removeOrphans();

        assertThat(dir.resolve(referenced.getStorageKey())).exists();
    }

    @Test
    void carriesOnWhenTheBytesCannotBeRemoved() {
        StoredFile first = stored();
        StoredFile second = stored();
        doThrow(new StorageException("down", null)).when(storage).delete(any());
        when(repository.findOrphans(any(), anyInt())).thenReturn(List.of(first, second));

        job.removeOrphans();

        verify(repository).deleteNow(first.getId());
        verify(repository).deleteNow(second.getId());
    }

    private StoredFile stored() {
        StoredFile file = new StoredFile();
        file.setId(UUID.randomUUID());
        file.setStorageKey("files/2026/10/" + UUID.randomUUID());
        storage.put(file.getStorageKey(), new ByteArrayResource(new byte[]{1}), 1, "application/pdf");
        return file;
    }
}
