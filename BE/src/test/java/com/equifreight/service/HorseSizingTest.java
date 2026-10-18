package com.equifreight.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.equifreight.entity.HorseSizeClass;
import com.equifreight.entity.enums.StallType;
import com.equifreight.exception.BusinessException;
import java.math.BigDecimal;
import java.util.List;
import org.junit.jupiter.api.Test;

class HorseSizingTest {

    private static final List<HorseSizeClass> CLASSES = List.of(
            sizeClass("S", 32, "10.0"),
            sizeClass("M", 32, "14.3"),
            sizeClass("L", 48, "16.3"),
            sizeClass("XL", 96, "17.3"));

    private static String classFor(String height, StallType stall) {
        return HorseSizing.sizeClassFor(new BigDecimal(height), stall, CLASSES).getCode();
    }

    private static void assertRefused(String height, String message) {
        assertThatThrownBy(() -> HorseSizing.requireValidHeight(new BigDecimal(height)))
                .isInstanceOf(BusinessException.class)
                .hasMessage(message)
                .extracting("code")
                .isEqualTo("INVALID_HEIGHT");
    }

    private static HorseSizeClass sizeClass(String code, int widthIn, String minHeightHh) {
        HorseSizeClass sizeClass = new HorseSizeClass();
        sizeClass.setCode(code);
        sizeClass.setWidthIn((short) widthIn);
        sizeClass.setMinHeightHh(new BigDecimal(minHeightHh));
        return sizeClass;
    }

    @Test
    void heightJustBelowABandStaysInTheLowerClass() {
        assertThat(classFor("14.2", StallType.STANDARD)).isEqualTo("S");
    }

    @Test
    void heightAtABandMinimumEntersThatClass() {
        assertThat(classFor("14.3", StallType.STANDARD)).isEqualTo("M");
        assertThat(classFor("16.3", StallType.STANDARD)).isEqualTo("L");
        assertThat(classFor("17.3", StallType.STANDARD)).isEqualTo("XL");
    }

    @Test
    void boxStallRaisesASmallerHorseToL() {
        assertThat(classFor("15.3", StallType.BOX)).isEqualTo("L");
    }

    @Test
    void boxStallKeepsAnXlHorseXl() {
        assertThat(classFor("17.3", StallType.BOX)).isEqualTo("XL");
    }

    @Test
    void climateStallDoesNotChangeTheClass() {
        assertThat(classFor("16.0", StallType.CLIMATE)).isEqualTo("M");
    }

    @Test
    void wholeAndTrailingZeroHeightsAreAccepted() {
        BigDecimal whole = HorseSizing.requireValidHeight(new BigDecimal("16"));
        assertThat(whole).isEqualByComparingTo("16.0");
        assertThat(whole.scale()).isEqualTo(1);

        BigDecimal trailingZero = HorseSizing.requireValidHeight(new BigDecimal("16.30"));
        assertThat(trailingZero).isEqualByComparingTo("16.3");
        assertThat(trailingZero.scale()).isEqualTo(1);
    }

    @Test
    void aHeightPastThreeInchesIsRefused() {
        assertRefused("16.4", "16.4 hh isn't a height: a hand is 4 inches, so 16.3 hh is followed by 17.0 hh.");
    }

    @Test
    void aHeightOutsideTheRangeIsRefused() {
        assertRefused("9.3", "Height must be between 10.0 and 19.3 hh; 9.3 hh was entered.");
        assertRefused("19.4", "Height must be between 10.0 and 19.3 hh; 19.4 hh was entered.");
    }

    @Test
    void aHeightWithTwoDecimalsIsRefused() {
        assertRefused("16.25", "16.25 hh isn't a height: write hands and inches, such as 16.2 hh.");
    }
}
