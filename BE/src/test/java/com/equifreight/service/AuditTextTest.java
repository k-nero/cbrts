package com.equifreight.service;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

/** audit_log.summary is varchar(500): a longer line is cut to fit, ending in "…". */
class AuditTextTest {

    @Test
    void aShortLineIsKept() {
        assertThat(AuditText.fit("Returned with a note: Which stable?")).isEqualTo("Returned with a note: Which stable?");
    }

    @Test
    void aLongLineIsCutWithAnEllipsis() {
        String fitted = AuditText.fit("x".repeat(600));

        assertThat(fitted).hasSize(AuditText.MAX).endsWith("…");
    }

    @Test
    void aCutNeverSplitsASurrogatePair() {
        String fitted = AuditText.fit("x".repeat(498) + "\uD83D\uDC0E" + "y".repeat(10));

        assertThat(fitted.length()).isLessThanOrEqualTo(AuditText.MAX);
        assertThat(Character.isHighSurrogate(fitted.charAt(fitted.length() - 2))).isFalse();
        assertThat(fitted).endsWith("x…");
    }
}
