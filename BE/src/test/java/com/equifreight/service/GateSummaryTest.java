package com.equifreight.service;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.List;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

class GateSummaryTest {

    @Test
    @DisplayName("One outstanding item is named, in the singular")
    void oneItem() {
        assertThat(TransportJobService.lockedSummary(List.of("Cambodia import permit waiting on GDAHP")))
                .isEqualTo("1 item is outstanding: Cambodia import permit waiting on GDAHP.");
    }

    @Test
    @DisplayName("Past three items, the rest are counted")
    void manyItems() {
        assertThat(TransportJobService.lockedSummary(List.of("A", "B", "C", "D", "E")))
                .isEqualTo("5 items are outstanding: A; B; C; and 2 more.");
    }
}
