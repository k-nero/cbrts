package com.equifreight.configuration;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * Where uploaded files are kept ({@code app.storage.*}).
 *
 * @param type  {@code s3} (compose and production) or {@code local} (a directory on this machine)
 * @param s3    used when {@code type} is {@code s3}
 * @param local used when {@code type} is {@code local}
 */
@ConfigurationProperties("app.storage")
public record StorageProperties(Type type, S3 s3, Local local) {

    public enum Type {
        S3,
        LOCAL
    }

    /**
     * Any S3-compatible service.
     *
     * @param endpoint  base URL of a self-hosted or non-AWS service; blank means AWS S3 itself
     * @param region    signing region; self-hosted servers accept any value
     * @param bucket    the one bucket every file goes into
     * @param accessKey blank, together with {@code secretKey}, means the AWS default credential chain
     * @param secretKey see {@code accessKey}
     * @param pathStyle {@code endpoint/bucket/key} URLs instead of {@code bucket.endpoint/key}
     */
    public record S3(
            String endpoint, String region, String bucket, String accessKey, String secretKey, boolean pathStyle) {}

    /**
     * @param dir directory the files are written under; relative paths are against the working directory
     */
    public record Local(String dir) {}
}
