package com.equifreight.service.pricing;

import static org.assertj.core.api.Assertions.assertThat;

import com.equifreight.entity.enums.TransportMode;
import java.math.BigDecimal;
import org.junit.jupiter.api.Test;

class PricingTextTest {

    @Test
    void moneyHasADollarSignGroupingAndCents() {
        assertThat(PricingText.money(new BigDecimal("16800"))).isEqualTo("$16,800.00");
        assertThat(PricingText.money(new BigDecimal("0.5"))).isEqualTo("$0.50");
    }

    @Test
    void percentagesDropTrailingZeros() {
        assertThat(PricingText.pct(new BigDecimal("1.500"))).isEqualTo("1.5%");
        assertThat(PricingText.pct(new BigDecimal("18.000"))).isEqualTo("18%");
    }

    @Test
    void groupCNamesTheMode() {
        assertThat(PricingText.groupName("C", TransportMode.AIR)).isEqualTo("Air freight");
        assertThat(PricingText.groupName("C", TransportMode.ROAD)).isEqualTo("Road freight");
        assertThat(PricingText.groupName("A", TransportMode.AIR)).isEqualTo("Ground transport · origin");
    }

    @Test
    void horsesAreCountedInWords() {
        assertThat(PricingText.horses(1)).isEqualTo("1 horse");
        assertThat(PricingText.horses(2)).isEqualTo("2 horses");
    }
}
