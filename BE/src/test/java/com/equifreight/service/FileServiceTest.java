package com.equifreight.service;

import com.equifreight.entity.Club;
import com.equifreight.entity.Role;
import com.equifreight.entity.StoredFile;
import com.equifreight.entity.User;
import com.equifreight.entity.enums.RoleName;
import com.equifreight.exception.BusinessException;
import com.equifreight.exception.ConflictException;
import com.equifreight.exception.ResourceNotFoundException;
import com.equifreight.model.file.FileResponse;
import com.equifreight.repository.StoredFileRepository;
import com.equifreight.service.storage.LocalFileStorage;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.mock.web.MockMultipartFile;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.security.MessageDigest;
import java.util.HexFormat;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Stream;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class FileServiceTest {

    private static final byte[] PDF = "%PDF-1.7\n1 0 obj << /Type /Catalog >> endobj\n%%EOF\n".getBytes(StandardCharsets.US_ASCII);
    private static final byte[] PNG = {(byte) 0x89, 'P', 'N', 'G', '\r', '\n', 0x1A, '\n', 0, 0, 0, 13, 'I', 'H', 'D', 'R'};

    private StoredFileRepository repository;
    @TempDir
    Path dir;

    private LocalFileStorage storage;
    private FileService service;

    @BeforeEach
    void setUp() {
        repository = mock(StoredFileRepository.class);
        storage = new LocalFileStorage(dir);
        service = new FileService(repository, storage);
        when(repository.save(any())).thenAnswer(inv -> {
            StoredFile file = inv.getArgument(0);
            file.setId(UUID.randomUUID());
            return file;
        });
    }

    // ---------- upload ----------

    @Test
    void storesAPdfUnderItsDetectedTypeWithItsChecksum() throws Exception {
        User customer = user(RoleName.CUSTOMER);

        FileResponse response = service.upload(
                new MockMultipartFile("file", "coggins.pdf", "application/pdf", PDF), customer);

        assertThat(response.getContentType()).isEqualTo("application/pdf");
        assertThat(response.getSizeBytes()).isEqualTo(PDF.length);
        assertThat(response.getSha256()).isEqualTo(HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(PDF)));
        assertThat(response.getUploadedById()).isEqualTo(customer.getId());
        assertThat(storedKeys()).hasSize(1);
        String key = storedKeys().getFirst();
        assertThat(key).matches("files/\\d{4}/\\d{2}/[0-9a-f-]{36}");
        assertThat(Files.readAllBytes(dir.resolve(key))).isEqualTo(PDF);
    }

    @Test
    void trustsTheBytesOverTheBrowsersContentType() {
        FileResponse response = service.upload(
                new MockMultipartFile("file", "photo.pdf", "application/pdf", PNG), user(RoleName.ESCORT));

        assertThat(response.getContentType()).isEqualTo("image/png");
    }

    @Test
    void rejectsATextFileRenamedToPdf() throws IOException {
        var upload = new MockMultipartFile("file", "passport.pdf", "application/pdf",
                "just some text".getBytes(StandardCharsets.UTF_8));

        assertThatThrownBy(() -> service.upload(upload, user(RoleName.CUSTOMER)))
                .isInstanceOf(BusinessException.class)
                .extracting("code").isEqualTo("FILE_TYPE_NOT_ALLOWED");
        assertThat(storedKeys()).isEmpty();
        verify(repository, never()).save(any());
    }

    @Test
    void rejectsAnEmptyFile() {
        var upload = new MockMultipartFile("file", "empty.pdf", "application/pdf", new byte[0]);

        assertThatThrownBy(() -> service.upload(upload, user(RoleName.CUSTOMER)))
                .isInstanceOf(BusinessException.class)
                .extracting("code").isEqualTo("FILE_EMPTY");
    }

    @Test
    void removesTheBytesWhenTheRowCannotBeSaved() throws IOException {
        doThrow(new DataIntegrityViolationException("boom")).when(repository).save(any());
        var upload = new MockMultipartFile("file", "coggins.pdf", "application/pdf", PDF);

        assertThatThrownBy(() -> service.upload(upload, user(RoleName.CUSTOMER)))
                .isInstanceOf(DataIntegrityViolationException.class);
        assertThat(storedKeys()).isEmpty();
    }

    @Test
    void keepsOnlyTheBaseNameOfTheUploadedFile() {
        assertThat(FileService.cleanFileName("../../etc/passwd")).isEqualTo("passwd");
        assertThat(FileService.cleanFileName("C:\\Users\\lan\\scan.pdf")).isEqualTo("scan.pdf");
        assertThat(FileService.cleanFileName("health\u0000\ncert.pdf")).isEqualTo("healthcert.pdf");
        assertThat(FileService.cleanFileName("  ")).isEqualTo("file");
        assertThat(FileService.cleanFileName(null)).isEqualTo("file");
        String longName = "a".repeat(300) + ".pdf";
        assertThat(FileService.cleanFileName(longName)).hasSize(255).endsWith(".pdf");
    }

    // ---------- reading ----------

    @Test
    void staffCanReadAnyFile() {
        StoredFile file = fileUploadedBy(user(RoleName.CUSTOMER));

        assertThat(service.get(file.getId(), user(RoleName.TRANSPORT_SPECIALIST)).getId()).isEqualTo(file.getId());
    }

    @Test
    void anyoneCanReadTheirOwnUpload() {
        User escort = user(RoleName.ESCORT);
        StoredFile file = fileUploadedBy(escort);

        assertThat(service.get(file.getId(), escort).getId()).isEqualTo(file.getId());
    }

    @Test
    void aCustomerCanReadFilesOnTheirClubsJobs() {
        User customer = customerOf(UUID.randomUUID());
        StoredFile file = fileUploadedBy(user(RoleName.TRANSPORT_SPECIALIST));
        when(repository.isOnClubJob(file.getId(), customer.getClub().getId())).thenReturn(true);

        assertThat(service.get(file.getId(), customer).getId()).isEqualTo(file.getId());
    }

    @Test
    void aCustomerGetsNotFoundForAnotherClubsFile() {
        User customer = customerOf(UUID.randomUUID());
        StoredFile file = fileUploadedBy(customerOf(UUID.randomUUID()));

        assertThatThrownBy(() -> service.get(file.getId(), customer)).isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    void anEscortCanReadFilesOnJobsTheyCrew() {
        User escort = user(RoleName.ESCORT);
        StoredFile file = fileUploadedBy(user(RoleName.CUSTOMER));
        when(repository.isOnCrewJob(file.getId(), escort.getId())).thenReturn(true);

        assertThat(service.get(file.getId(), escort).getId()).isEqualTo(file.getId());
    }

    @Test
    void anEscortGetsNotFoundForOtherJobsFiles() {
        StoredFile file = fileUploadedBy(user(RoleName.CUSTOMER));

        assertThatThrownBy(() -> service.get(file.getId(), user(RoleName.ESCORT)))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    void opensTheStoredBytes() throws Exception {
        User customer = user(RoleName.CUSTOMER);
        StoredFile file = fileUploadedBy(customer);
        storage.put(file.getStorageKey(), new ByteArrayResource(PDF), PDF.length, "application/pdf");

        try (var content = service.open(file.getId(), customer).content()) {
            assertThat(content.readAllBytes()).isEqualTo(PDF);
        }
    }

    // ---------- attaching ----------

    @Test
    void attachesTheUsersOwnUnattachedUpload() {
        User customer = user(RoleName.CUSTOMER);
        StoredFile file = fileUploadedBy(customer);

        assertThat(service.requireAttachable(file.getId(), customer)).isSameAs(file);
    }

    @Test
    void refusesToAttachSomeoneElsesUpload() {
        StoredFile file = fileUploadedBy(user(RoleName.CUSTOMER));

        assertThatThrownBy(() -> service.requireAttachable(file.getId(), user(RoleName.CUSTOMER)))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    void refusesToAttachAFileTwice() {
        User customer = user(RoleName.CUSTOMER);
        StoredFile file = fileUploadedBy(customer);
        when(repository.isAttached(file.getId())).thenReturn(true);

        assertThatThrownBy(() -> service.requireAttachable(file.getId(), customer))
                .isInstanceOf(ConflictException.class)
                .extracting("code").isEqualTo("FILE_ALREADY_ATTACHED");
    }

    // ---------- helpers ----------

    /** Keys of the files stored under the temp directory, e.g. {@code files/2026/10/<uuid>}. */
    private List<String> storedKeys() throws IOException {
        try (Stream<Path> paths = Files.walk(dir)) {
            return paths.filter(Files::isRegularFile)
                    .map(path -> dir.relativize(path).toString().replace('\\', '/'))
                    .toList();
        }
    }

    private static User user(String roleName) {
        Role role = new Role();
        role.setName(roleName);
        User user = new User();
        user.setId(UUID.randomUUID());
        user.setRoles(Set.of(role));
        return user;
    }

    private static User customerOf(UUID clubId) {
        Club club = new Club();
        club.setId(clubId);
        User customer = user(RoleName.CUSTOMER);
        customer.setClub(club);
        return customer;
    }

    private StoredFile fileUploadedBy(User uploader) {
        StoredFile file = new StoredFile();
        file.setId(UUID.randomUUID());
        file.setStorageKey("files/2026/10/" + UUID.randomUUID());
        file.setFileName("coggins.pdf");
        file.setContentType("application/pdf");
        file.setSizeBytes(PDF.length);
        file.setSha256("0".repeat(64));
        file.setUploadedBy(uploader);
        when(repository.findById(file.getId())).thenReturn(Optional.of(file));
        return file;
    }
}
