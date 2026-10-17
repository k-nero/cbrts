package com.equifreight.service;

import com.equifreight.entity.RequestRevision;

import java.time.Instant;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * When each version of a request was returned for information (US-F1-04). A return writes its note on the
 * version it was about and one REQUEST_INFO_REQUIRED audit row, so the k-th return belongs to the k-th
 * version that carries a note.
 */
public final class RevisionDates {

    private RevisionDates() {}

    /** Revision number to the time it was returned; a version never returned has no entry. */
    public static Map<Short, Instant> returnedAt(List<RequestRevision> revisions, List<Instant> returns) {
        Map<Short, Instant> dates = new HashMap<>();
        int next = 0;
        for (RequestRevision revision : revisions) {
            if (revision.getNote() == null) {
                continue;
            }
            if (next >= returns.size()) {
                break;
            }
            dates.put(revision.getRevisionNo(), returns.get(next++));
        }
        return dates;
    }
}
