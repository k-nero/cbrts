package com.equifreight.job;

import com.equifreight.entity.StoredFile;
import com.equifreight.exception.StorageException;
import com.equifreight.repository.StoredFileRepository;
import com.equifreight.service.storage.FileStorage;
import lombok.extern.log4j.Log4j2;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.support.TransactionTemplate;

import java.time.Duration;
import java.time.Instant;
import java.util.List;

/**
 * Files are uploaded before they're attached, so an upload whose form was abandoned stays behind
 * with nothing pointing at it. Once a day this removes uploads that are still unattached a day later.
 *
 * <p>Each file is its own transaction, row first, bytes second. If a table this job doesn't know
 * about still references the file, the foreign key rejects the delete and the file is kept; a row
 * is never removed while its bytes are still in use. If the bytes can't be removed after the row is
 * gone, they're only wasted space.
 */
@Log4j2
@Component
public class OrphanFileCleanupJob {

    static final Duration GRACE = Duration.ofDays(1);
    private static final int BATCH = 500;

    private final StoredFileRepository storedFileRepository;
    private final FileStorage fileStorage;
    private final TransactionTemplate transactionTemplate;

    public OrphanFileCleanupJob(StoredFileRepository storedFileRepository, FileStorage fileStorage,
                                TransactionTemplate transactionTemplate) {
        this.storedFileRepository = storedFileRepository;
        this.fileStorage = fileStorage;
        this.transactionTemplate = transactionTemplate;
    }

    /** 03:30 server time, when nobody is mid-upload. */
    @Scheduled(cron = "0 30 3 * * *")
    public void removeOrphans() {
        List<StoredFile> orphans = storedFileRepository.findOrphans(Instant.now().minus(GRACE), BATCH);
        int removed = 0;
        for (StoredFile file : orphans) {
            if (remove(file)) {
                removed++;
            }
        }
        if (removed > 0) {
            log.info("Removed {} unattached upload(s)", removed);
        }
    }

    private boolean remove(StoredFile file) {
        try {
            transactionTemplate.executeWithoutResult(status -> storedFileRepository.deleteNow(file.getId()));
        } catch (DataIntegrityViolationException e) {
            log.warn("Kept file {}: it is still referenced", file.getId());
            return false;
        }
        try {
            fileStorage.delete(file.getStorageKey());
        } catch (StorageException e) {
            log.warn("Removed file {} but not its bytes at {}", file.getId(), file.getStorageKey(), e);
        }
        return true;
    }
}
