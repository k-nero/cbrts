package com.equifreight.configuration;

import com.equifreight.service.storage.FileStorage;
import com.equifreight.service.storage.LocalFileStorage;
import com.equifreight.service.storage.S3FileStorage;
import lombok.extern.log4j.Log4j2;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import software.amazon.awssdk.auth.credentials.AwsBasicCredentials;
import software.amazon.awssdk.auth.credentials.DefaultCredentialsProvider;
import software.amazon.awssdk.auth.credentials.StaticCredentialsProvider;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.S3ClientBuilder;

import java.net.URI;
import java.nio.file.Path;

/**
 * Picks the {@link FileStorage} from {@code app.storage.type} when the app starts. This is a plain
 * branch, not {@code @ConditionalOnProperty}: with Spring AOT (the Docker image) conditions are fixed
 * at build time, so a conditional bean would ignore STORAGE_TYPE at runtime.
 *
 * <p>Neither store connects to anything here, so the app (and the AOT cache training run in the
 * Dockerfile) starts without the store being reachable.
 */
@Log4j2
@Configuration
@EnableConfigurationProperties(StorageProperties.class)
public class StorageConfiguration {

    @Bean(destroyMethod = "close")
    public FileStorage fileStorage(StorageProperties properties) {
        if (properties.type() == StorageProperties.Type.LOCAL) {
            Path dir = Path.of(properties.local().dir()).toAbsolutePath().normalize();
            log.info("Storing uploaded files under {} (local storage, not for production)", dir);
            return new LocalFileStorage(dir);
        }
        return new S3FileStorage(s3Client(properties.s3()), properties.s3().bucket());
    }

    private static S3Client s3Client(StorageProperties.S3 s3) {
        S3ClientBuilder builder = S3Client.builder()
                .region(Region.of(s3.region()))
                .forcePathStyle(s3.pathStyle());
        if (s3.endpoint() != null && !s3.endpoint().isBlank()) {
            builder.endpointOverride(URI.create(s3.endpoint()));
        }
        if (s3.accessKey() != null && !s3.accessKey().isBlank()) {
            builder.credentialsProvider(StaticCredentialsProvider.create(
                    AwsBasicCredentials.create(s3.accessKey(), s3.secretKey())));
        } else {
            builder.credentialsProvider(DefaultCredentialsProvider.builder().build());
        }
        return builder.build();
    }
}
