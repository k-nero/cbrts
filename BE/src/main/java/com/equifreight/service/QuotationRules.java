package com.equifreight.service;

import com.equifreight.entity.Quotation;
import com.equifreight.entity.TransportRequest;
import com.equifreight.entity.enums.QuotationStatus;
import com.equifreight.entity.enums.RequestStatus;
import com.equifreight.exception.ConflictException;
import java.util.Set;

/**
 * When a quotation's draft can be written (spec §5.1): the first version while the request is in review, a revision
 * while the request is quoted or its quotation expired. An issued version is never changed.
 */
final class QuotationRules {

    private static final Set<RequestStatus> FIRST_VERSION = Set.of(RequestStatus.SUBMITTED, RequestStatus.UNDER_REVIEW);
    private static final Set<RequestStatus> REVISION = Set.of(RequestStatus.QUOTED, RequestStatus.EXPIRED);

    private QuotationRules() {}

    static void requireDraft(Quotation q) {
        if (q.getStatus() != QuotationStatus.DRAFT) {
            throw new ConflictException(
                    "QUOTATION_NOT_DRAFT",
                    "This version has been issued and can't be changed. Revise it to make a new version.");
        }
    }

    /** The draft is checked first, so a write that lands after an issue says so rather than naming the status. */
    static void requireWritable(TransportRequest request, Quotation q) {
        requireDraft(q);
        Set<RequestStatus> allowed = q.getVersionNo() == 1 ? FIRST_VERSION : REVISION;
        if (!allowed.contains(request.getStatus())) {
            throw new ConflictException("REQUEST_NOT_QUOTABLE", "This request can't be quoted in its current state.");
        }
    }
}
