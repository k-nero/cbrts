package com.equifreight.service.storage;

import com.equifreight.exception.StorageException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.core.io.ByteArrayResource;

import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.stream.Stream;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class LocalFileStorageTest {

    private static final String KEY = "files/2026/10/0b5e6a1c-3f2d-4e8a-9c71-5d2f8e4b6a90";
    private static final byte[] BYTES = "health certificate".getBytes(StandardCharsets.UTF_8);

    @TempDir
    Path dir;

    private LocalFileStorage storage;

    @BeforeEach
    void setUp() {
        storage = new LocalFileStorage(dir);
    }

    @Test
    void readsBackWhatWasStored() throws IOException {
        storage.put(KEY, new ByteArrayResource(BYTES), BYTES.length, "application/pdf");

        try (InputStream in = storage.open(KEY)) {
            assertThat(in.readAllBytes()).isEqualTo(BYTES);
        }
        assertThat(dir.resolve(KEY)).exists();
    }

    @Test
    void neverOverwritesAKey() throws IOException {
        storage.put(KEY, new ByteArrayResource(BYTES), BYTES.length, "application/pdf");
        byte[] other = "something else".getBytes(StandardCharsets.UTF_8);

        assertThatThrownBy(() -> storage.put(KEY, new ByteArrayResource(other), other.length, "application/pdf"))
                .isInstanceOf(StorageException.class);
        assertThat(Files.readAllBytes(dir.resolve(KEY))).isEqualTo(BYTES);
        assertThat(leftoverTempFiles()).isZero();
    }

    @Test
    void refusesAShortWriteAndLeavesNothingBehind() throws IOException {
        assertThatThrownBy(() -> storage.put(KEY, new ByteArrayResource(BYTES), BYTES.length + 1, "application/pdf"))
                .isInstanceOf(StorageException.class);
        assertThat(dir.resolve(KEY)).doesNotExist();
        assertThat(leftoverTempFiles()).isZero();
    }

    @Test
    void refusesKeysOutsideTheRoot() {
        assertThatThrownBy(() -> storage.open("../outside.pdf")).isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> storage.delete("files/../../outside.pdf")).isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void reportsAMissingFile() {
        assertThatThrownBy(() -> storage.open(KEY)).isInstanceOf(StorageException.class);
    }

    @Test
    void deletingAMissingKeyIsFine() {
        storage.delete(KEY);

        storage.put(KEY, new ByteArrayResource(BYTES), BYTES.length, "application/pdf");
        storage.delete(KEY);
        assertThat(dir.resolve(KEY)).doesNotExist();
    }

    private long leftoverTempFiles() throws IOException {
        try (Stream<Path> paths = Files.walk(dir)) {
            return paths.filter(p -> p.getFileName().toString().endsWith(".tmp")).count();
        }
    }
}
