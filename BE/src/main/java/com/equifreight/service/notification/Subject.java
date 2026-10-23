package com.equifreight.service.notification;

import com.equifreight.entity.AuthoritySubmission;
import com.equifreight.entity.Quotation;
import com.equifreight.entity.TransportJob;
import com.equifreight.entity.TransportRequest;
import com.equifreight.entity.enums.NotificationSubject;
import java.util.UUID;

/**
 * The record a notification is about: its type, id and code, plus the request and job the pages that show it are
 * keyed by.
 */
public record Subject(NotificationSubject type, UUID id, String code, UUID requestId, UUID jobId) {

    public static Subject request(TransportRequest request) {
        return new Subject(
                NotificationSubject.TRANSPORT_REQUEST, request.getId(), request.getCode(), request.getId(), null);
    }

    public static Subject quotation(Quotation quotation) {
        return new Subject(
                NotificationSubject.QUOTATION,
                quotation.getId(),
                quotation.getCode(),
                quotation.getRequest().getId(),
                null);
    }

    public static Subject job(TransportJob job) {
        return new Subject(
                NotificationSubject.TRANSPORT_JOB, job.getId(), job.getCode(), requestIdOf(job), job.getId());
    }

    public static Subject authoritySubmission(AuthoritySubmission submission) {
        TransportJob job = submission.getJob();
        return new Subject(
                NotificationSubject.AUTHORITY_SUBMISSION,
                submission.getId(),
                job.getCode(),
                requestIdOf(job),
                job.getId());
    }

    private static UUID requestIdOf(TransportJob job) {
        return job.getRequest() == null ? null : job.getRequest().getId();
    }
}
