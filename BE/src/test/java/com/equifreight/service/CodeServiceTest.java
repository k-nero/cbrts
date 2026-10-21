package com.equifreight.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.equifreight.entity.enums.CodePrefix;
import com.equifreight.repository.CodeCounterRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

/** Human codes are issued from code_counters and formatted per prefix. */
class CodeServiceTest {

    private CodeCounterRepository counters;
    private CodeService service;

    @BeforeEach
    void setUp() {
        counters = mock(CodeCounterRepository.class);
        service = new CodeService(counters);
    }

    @Test
    void formatsEachYearlyPrefix() {
        when(counters.nextValue("REQ", (short) 2026)).thenReturn(1);
        when(counters.nextValue("Q", (short) 2026)).thenReturn(12);
        when(counters.nextValue("CBRT", (short) 2026)).thenReturn(41);
        when(counters.nextValue("INV", (short) 2026)).thenReturn(7);

        assertThat(service.next(CodePrefix.REQ, 2026)).isEqualTo("REQ-2026-0001");
        assertThat(service.next(CodePrefix.Q, 2026)).isEqualTo("Q-2026-0012");
        assertThat(service.next(CodePrefix.CBRT, 2026)).isEqualTo("CBRT-2026-041");
        assertThat(service.next(CodePrefix.INV, 2026)).isEqualTo("INV-2026-0007");
    }

    @Test
    void aNumberPastItsDigitsStillFormats() {
        when(counters.nextValue("REQ", (short) 2026)).thenReturn(10000);

        assertThat(service.next(CodePrefix.REQ, 2026)).isEqualTo("REQ-2026-10000");
    }

    @Test
    void staffCodesAreNotYearly() {
        assertThatThrownBy(() -> service.next(CodePrefix.EF, 2026))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("EF codes have no year");
    }
}
