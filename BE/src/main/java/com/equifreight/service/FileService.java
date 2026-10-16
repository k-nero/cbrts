package com.equifreight.service;

import com.equifreight.entity.Role;
import com.equifreight.entity.StoredFile;
import com.equifreight.entity.User;
import com.equifreight.entity.enums.RoleName;
import com.equifreight.exception.BusinessException;
import com.equifreight.exception.ConflictException;
import com.equifreight.exception.ResourceNotFoundException;
import com.equifreight.exception.StorageException;
import com.equifreight.model.file.FileMapper;
import com.equifreight.model.file.FileResponse;
import com.equifreight.repository.StoredFileRepository;
import com.equifreight.service.storage.FileStorage;
import lombok.extern.log4j.Log4j2;
import org.apache.tika.Tika;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.BufferedInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.security.DigestInputStream;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.ZoneOffset;
import java.time.ZonedDateTime;
import java.util.HexFormat;
import java.util.Set;
import java.util.UUID;

/**
 * Uploads and downloads of files: horse papers and medical records, incident photos, filing results.
 * A file is uploaded on its own first, then attached by id (a document version, an incident, a filing).
 *
 * <p>Who can read a file: staff (manager, specialist, coordinator) any file; anyone the file they
 * uploaded; a customer the documents and filing results on their club's jobs; an escort anything
 * attached to a job they crew. Everyone else gets 404, so ids don't reveal which files exist.
 */
@Log4j2
@Service
public class FileService {

    public static final long MAX_SIZE_BYTES = 25L * 1024 * 1024;

    /** PDFs for papers and records; photos from cameras and phones (iPhones save HEIC). */
    static final Set<String> ALLOWED_TYPES = Set.of(
            "application/pdf", "image/jpeg", "image/png", "image/heic", "image/heif");

    private static final Set<String> STAFF_ROLES = Set.of(
            RoleName.LOGISTICS_MANAGER, RoleName.TRANSPORT_SPECIALIST, RoleName.FLEET_COORDINATOR);

    private final StoredFileRepository storedFileRepository;
    private final FileStorage fileStorage;
    private final Tika tika = new Tika();

    public FileService(StoredFileRepository storedFileRepository, FileStorage fileStorage) {
        this.storedFileRepository = storedFileRepository;
        this.fileStorage = fileStorage;
    }

    /** An open file's metadata and bytes. The caller closes {@code content}. */
    public record FileContent(StoredFile file, InputStream content) {}

    /**
     * Validates and stores an upload. The bytes are written first and the row second; if the row
     * can't be saved the bytes are removed again, so a {@code files} row never points at nothing.
     */
    public FileResponse upload(MultipartFile upload, User uploader) {
        if (upload == null || upload.isEmpty()) {
            throw new BusinessException("FILE_EMPTY", "The file is empty");
        }
        if (upload.getSize() > MAX_SIZE_BYTES) {
            throw new BusinessException("FILE_TOO_LARGE", "Files can be at most 25 MB");
        }
        String contentType = detectType(upload);
        if (!ALLOWED_TYPES.contains(contentType)) {
            throw new BusinessException("FILE_TYPE_NOT_ALLOWED", "Only PDF, JPEG, PNG and HEIC files can be uploaded");
        }

        String checksum = sha256Of(upload);
        String key = newStorageKey();
        fileStorage.put(key, upload, upload.getSize(), contentType);

        StoredFile file = new StoredFile();
        file.setStorageKey(key);
        file.setFileName(cleanFileName(upload.getOriginalFilename()));
        file.setContentType(contentType);
        file.setSizeBytes(upload.getSize());
        file.setSha256(checksum);
        file.setUploadedBy(uploader);
        try {
            return FileMapper.toResponse(storedFileRepository.save(file));
        } catch (RuntimeException e) {
            deleteQuietly(key);
            throw e;
        }
    }

    @Transactional(readOnly = true)
    public FileResponse get(UUID id, User user) {
        return FileMapper.toResponse(findReadable(id, user));
    }

    @Transactional(readOnly = true)
    public FileContent open(UUID id, User user) {
        StoredFile file = findReadable(id, user);
        return new FileContent(file, fileStorage.open(file.getStorageKey()));
    }

    /**
     * For services that attach an upload to a record: the file must exist, be the user's own upload,
     * and not be attached anywhere yet. One file belongs to one record, so reading it never depends
     * on two jobs at once, and an append-only document version can't share bytes with another one.
     */
    @Transactional(readOnly = true)
    public StoredFile requireAttachable(UUID id, User user) {
        StoredFile file = storedFileRepository.findById(id)
                .filter(f -> isUploader(f, user))
                .orElseThrow(() -> ResourceNotFoundException.of("File", id));
        if (storedFileRepository.isAttached(id)) {
            throw new ConflictException("FILE_ALREADY_ATTACHED", "This file is already attached to another record");
        }
        return file;
    }

    private StoredFile findReadable(UUID id, User user) {
        return storedFileRepository.findById(id)
                .filter(f -> canRead(f, user))
                .orElseThrow(() -> ResourceNotFoundException.of("File", id));
    }

    private boolean canRead(StoredFile file, User user) {
        if (hasAnyRole(user, STAFF_ROLES) || isUploader(file, user)) {
            return true;
        }
        if (hasAnyRole(user, Set.of(RoleName.CUSTOMER)) && user.getClub() != null
                && storedFileRepository.isOnClubJob(file.getId(), user.getClub().getId())) {
            return true;
        }
        return hasAnyRole(user, Set.of(RoleName.ESCORT)) && storedFileRepository.isOnCrewJob(file.getId(), user.getId());
    }

    private static boolean isUploader(StoredFile file, User user) {
        return file.getUploadedBy() != null && file.getUploadedBy().getId().equals(user.getId());
    }

    private static boolean hasAnyRole(User user, Set<String> roles) {
        return user.getRoles().stream().map(Role::getName).anyMatch(roles::contains);
    }

    /** Sniffs the type from the leading bytes only; the file name and the browser's Content-Type are ignored. */
    private String detectType(MultipartFile upload) {
        try (InputStream in = new BufferedInputStream(upload.getInputStream())) {
            return tika.detect(in);
        } catch (IOException e) {
            throw new StorageException("Could not read the upload", e);
        }
    }

    /** {@code files/2026/10/<uuid>}: unique per upload, so a key is never written twice. */
    private static String newStorageKey() {
        ZonedDateTime now = ZonedDateTime.now(ZoneOffset.UTC);
        return "files/%d/%02d/%s".formatted(now.getYear(), now.getMonthValue(), UUID.randomUUID());
    }

    /** Keeps the base name the user chose, minus any path and control characters, at most 255 characters. */
    static String cleanFileName(String original) {
        if (original == null) {
            return "file";
        }
        String name = original.substring(Math.max(original.lastIndexOf('/'), original.lastIndexOf('\\')) + 1)
                .replaceAll("\\p{Cntrl}", "")
                .strip();
        if (name.isEmpty()) {
            return "file";
        }
        return name.length() <= 255 ? name : name.substring(name.length() - 255);
    }

    private void deleteQuietly(String key) {
        try {
            fileStorage.delete(key);
        } catch (StorageException e) {
            // Left behind in the bucket with no row; harmless apart from the space it takes.
            log.warn("Could not remove {} after a failed upload", key, e);
        }
    }

    /** A separate pass over the upload (Tomcat has it on disk), so storage retries can't skew the digest. */
    private static String sha256Of(MultipartFile upload) {
        try (InputStream in = new DigestInputStream(upload.getInputStream(), MessageDigest.getInstance("SHA-256"))) {
            in.transferTo(OutputStream.nullOutputStream());
            return HexFormat.of().formatHex(((DigestInputStream) in).getMessageDigest().digest());
        } catch (IOException e) {
            throw new StorageException("Could not read the upload", e);
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 is always available", e);
        }
    }
}
