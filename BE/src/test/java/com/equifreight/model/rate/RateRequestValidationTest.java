package com.equifreight.model.rate;

import static org.assertj.core.api.Assertions.assertThat;

import com.equifreight.entity.enums.RateBasis;
import jakarta.validation.ConstraintViolation;
import jakarta.validation.Validation;
import jakarta.validation.Validator;
import java.math.BigDecimal;
import java.util.Set;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;

/** US-Q-10 (#31): money and quantities in the rate catalog are stored with two decimals, so more is refused. */
class RateRequestValidationTest {

    private static Validator validator;

    @BeforeAll
    static void setUp() {
        validator = Validation.buildDefaultValidatorFactory().getValidator();
    }

    private static RateLineRequest.RateLineRequestBuilder line() {
        return RateLineRequest.builder()
                .code("ROAD_PRIVATE")
                .group("C")
                .description("Private trailer")
                .basis(RateBasis.PER_KM)
                .rate(new BigDecimal("3.60"));
    }

    private static <T> String onlyViolation(Set<ConstraintViolation<T>> violations) {
        assertThat(violations).hasSize(1);
        ConstraintViolation<T> v = violations.iterator().next();
        return v.getPropertyPath() + ": " + v.getMessage();
    }

    @Test
    void aLineWithTwoDecimalsIsValid() {
        assertThat(validator.validate(line().minCharge(new BigDecimal("400.50"))
                        .defaultQuantity(new BigDecimal("2.25"))
                        .build()))
                .isEmpty();
    }

    @Test
    void aRateWithMoreThanTwoDecimalsIsRefused() {
        assertThat(onlyViolation(
                        validator.validate(line().rate(new BigDecimal("3.605")).build())))
                .isEqualTo("rate: Use at most 2 decimals.");
        assertThat(onlyViolation(validator.validate(
                        line().minCharge(new BigDecimal("400.001")).build())))
                .isEqualTo("minCharge: Use at most 2 decimals.");
        assertThat(onlyViolation(validator.validate(
                        line().defaultQuantity(new BigDecimal("1.125")).build())))
                .isEqualTo("defaultQuantity: Use at most 2 decimals.");
    }

    @Test
    void aPositionRateWithMoreThanTwoDecimalsIsRefused() {
        assertThat(validator.validate(new ServiceClassRequest((short) 48, new BigDecimal("16800.50"))))
                .isEmpty();
        assertThat(onlyViolation(validator.validate(new ServiceClassRequest((short) 48, new BigDecimal("16800.505")))))
                .isEqualTo("positionRate: Use at most 2 decimals.");
    }
}
