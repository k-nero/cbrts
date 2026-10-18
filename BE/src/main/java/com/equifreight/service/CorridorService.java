package com.equifreight.service;

import com.equifreight.entity.Corridor;
import com.equifreight.entity.User;
import com.equifreight.exception.BusinessException;
import com.equifreight.exception.ResourceNotFoundException;
import com.equifreight.model.route.CorridorResponse;
import com.equifreight.repository.CorridorRepository;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * The routes we run, as the fleet & route coordinator manages them (#115): how far a request's flexible dates
 * can move on each one. A change applies to drafts at once and to every request submitted after it; a submitted
 * request keeps the value it was submitted with.
 */
@Service
public class CorridorService {

    static final String ENTITY_TYPE = "CORRIDOR";
    /** audit_log.entity_code is varchar(20); a longer corridor code is named in the summary only. */
    private static final int AUDIT_CODE_MAX = 20;

    private final CorridorRepository corridors;
    private final AuditService audit;

    public CorridorService(CorridorRepository corridors, AuditService audit) {
        this.corridors = corridors;
        this.audit = audit;
    }

    @Transactional(readOnly = true)
    public Page<CorridorResponse> list(Pageable pageable) {
        return corridors.findAll(pageable).map(CorridorResponse::of);
    }

    /** Sets the route's flex days and writes the decision to the audit log; the same value changes nothing. */
    @Transactional
    public CorridorResponse setDateFlexDays(User actor, UUID id, int days) {
        Corridor corridor = corridors.findById(id).orElseThrow(() -> ResourceNotFoundException.of("Corridor", id));
        if (days < 0 || days > LeadTimePolicy.MAX_FLEX_DAYS) {
            throw new BusinessException(
                    "DATE_FLEX",
                    "A route's dates can move by 0 to " + LeadTimePolicy.MAX_FLEX_DAYS + " days; " + days
                            + " was given.");
        }
        int before = corridor.getDateFlexDays();
        if (before == days) {
            return CorridorResponse.of(corridor);
        }
        corridor.setDateFlexDays((short) days);
        Corridor saved = corridors.save(corridor);
        audit.recordDecision(
                actor,
                "CORRIDOR_DATE_FLEX_CHANGED",
                "Flexible dates on " + corridor.getCode() + ": " + words(before) + " → " + words(days) + ".",
                ENTITY_TYPE,
                saved.getId(),
                corridor.getCode().length() <= AUDIT_CODE_MAX ? corridor.getCode() : null,
                null,
                "{\"dateFlexDays\":" + before + "}",
                "{\"dateFlexDays\":" + days + "}");
        return CorridorResponse.of(saved);
    }

    /** "±3 days", "±1 day", "fixed dates only". */
    static String words(int days) {
        return days == 0 ? "fixed dates only" : "±" + days + (days == 1 ? " day" : " days");
    }
}
