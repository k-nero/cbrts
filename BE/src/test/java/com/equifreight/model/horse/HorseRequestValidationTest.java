package com.equifreight.model.horse;

import static org.assertj.core.api.Assertions.assertThat;

import com.equifreight.entity.enums.HorseSex;
import jakarta.validation.ConstraintViolation;
import jakarta.validation.Validation;
import jakarta.validation.Validator;
import java.math.BigDecimal;
import java.util.Set;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

/**
 * H-01: name, sex, height, microchip, passport number and declared value are required.
 */
class HorseRequestValidationTest {

    private static Validator validator;

    @BeforeAll
    static void setUp() {
        validator = Validation.buildDefaultValidatorFactory().getValidator();
    }

    private static HorseRequest.HorseRequestBuilder complete() {
        return HorseRequest.builder()
                .name("Nightfall")
                .sex(HorseSex.MARE)
                .heightHh(new BigDecimal("16.0"))
                .microchip("250259600223311")
                .passportNo("VN-PP-2022-0188")
                .declaredValue(new BigDecimal("240000"));
    }

    @ParameterizedTest
    @ValueSource(strings = {"name", "sex", "heightHh", "microchip", "passportNo", "declaredValue"})
    void aRequestMissingARequiredFieldIsInvalid(String field) {
        HorseRequest request = switch (field) {
            case "name" -> complete().name(" ").build();
            case "sex" -> complete().sex(null).build();
            case "heightHh" -> complete().heightHh(null).build();
            case "microchip" -> complete().microchip("").build();
            case "passportNo" -> complete().passportNo(null).build();
            case "declaredValue" -> complete().declaredValue(null).build();
            default -> throw new IllegalArgumentException(field);
        };

        Set<ConstraintViolation<HorseRequest>> violations = validator.validate(request);

        assertThat(violations).hasSize(1);
        assertThat(violations.iterator().next().getPropertyPath().toString()).isEqualTo(field);
    }

    @Test
    void aCompleteRequestIsValid() {
        assertThat(validator.validate(complete().build())).isEmpty();
    }
}
