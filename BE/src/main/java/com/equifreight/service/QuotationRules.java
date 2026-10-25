package com.equifreight.service;

import com.equifreight.configuration.BusinessTime;
import com.equifreight.entity.Quotation;
import com.equifreight.entity.TransportRequest;
import com.equifreight.entity.enums.QuotationStatus;
import com.equifreight.entity.enums.RequestStatus;
import com.equifreight.exception.ConflictException;
import java.util.Set;

/**
 * When a quotation's draft can be written (spec §5.1): the first version while the request is in review, a revision
 * while the request is quoted or its quotation expired. An issued version is never changed, and a declined one is
 * never superseded: the customer's decline closes the request (requote spec §4.1).
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

    /**
     * The draft is checked first, so a write that lands after an issue says so rather than naming the status. Then
     * the version it was drafted from ({@code previous}, null for the first version): once the customer declined it,
     * the draft can only be discarded.
     */
    static void requireWritable(TransportRequest request, Quotation q, Quotation previous) {
        requireDraft(q);
        if (previous != null && previous.getStatus() == QuotationStatus.DECLINED) {
            String on = previous.getDeclinedAt() == null
                    ? "an earlier date"
                    : BusinessTime.DAY.format(previous.getDeclinedAt().atZone(BusinessTime.ZONE));
            throw new ConflictException(
                    "QUOTATION_DECLINED",
                    "The customer declined version " + previous.getVersionNo() + " on " + on + ", so "
                            + request.getCode() + " is closed. Discard this draft.");
        }
        Set<RequestStatus> allowed = q.getVersionNo() == 1 ? FIRST_VERSION : REVISION;
        if (!allowed.contains(request.getStatus())) {
            throw new ConflictException("REQUEST_NOT_QUOTABLE", "This request can't be quoted in its current state.");
        }
    }
}
