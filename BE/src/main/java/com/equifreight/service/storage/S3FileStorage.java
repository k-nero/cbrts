package com.equifreight.service.storage;

import com.equifreight.exception.StorageException;
import org.springframework.core.io.InputStreamSource;
import software.amazon.awssdk.core.exception.SdkException;
import software.amazon.awssdk.http.ContentStreamProvider;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.services.s3.S3Client;

import java.io.IOException;
import java.io.InputStream;
import java.io.UncheckedIOException;

/** {@link FileStorage} on any S3-compatible service, all files in one bucket. Closing it closes the client. */
public class S3FileStorage implements FileStorage {

    private final S3Client s3;
    private final String bucket;

    public S3FileStorage(S3Client s3, String bucket) {
        this.s3 = s3;
        this.bucket = bucket;
    }

    @Override
    public void put(String key, InputStreamSource content, long size, String contentType) {
        // The SDK opens a fresh stream for every attempt, so its retries resend the whole file.
        ContentStreamProvider streams = () -> {
            try {
                return content.getInputStream();
            } catch (IOException e) {
                throw new UncheckedIOException(e);
            }
        };
        try {
            s3.putObject(b -> b.bucket(bucket).key(key).contentType(contentType).contentLength(size),
                    RequestBody.fromContentProvider(streams, size, contentType));
        } catch (SdkException | UncheckedIOException e) {
            throw new StorageException("Could not store the file", e);
        }
    }

    @Override
    public InputStream open(String key) {
        try {
            return s3.getObject(b -> b.bucket(bucket).key(key));
        } catch (SdkException e) {
            // A missing object is also an error here: the files row says it exists.
            throw new StorageException("Could not read the file", e);
        }
    }

    @Override
    public void delete(String key) {
        try {
            s3.deleteObject(b -> b.bucket(bucket).key(key));
        } catch (SdkException e) {
            throw new StorageException("Could not delete the file", e);
        }
    }

    @Override
    public void close() {
        s3.close();
    }
}
