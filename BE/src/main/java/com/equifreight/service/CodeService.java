package com.equifreight.service;

import com.equifreight.entity.enums.CodePrefix;
import com.equifreight.repository.CodeCounterRepository;
import org.springframework.stereotype.Service;

/**
 * Issues the yearly human codes (REQ-2026-0193, Q-2026-0188, CBRT-2026-041, INV-2026-0012) from
 * {@code code_counters}. Called inside the creating transaction; a code is unique and never reused.
 */
@Service
public class CodeService {

    private final CodeCounterRepository counters;

    public CodeService(CodeCounterRepository counters) {
        this.counters = counters;
    }

    public String next(CodePrefix prefix, int year) {
        int digits = switch (prefix) {
            case REQ, Q, INV -> 4;
            case CBRT, TRP -> 3;
            case EF -> throw new IllegalArgumentException("EF codes have no year");
        };
        int value = counters.nextValue(prefix.name(), (short) year);
        return String.format("%s-%d-%0" + digits + "d", prefix.name(), year, value);
    }
}
