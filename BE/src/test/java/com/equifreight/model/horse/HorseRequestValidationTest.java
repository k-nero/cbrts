package com.equifreight.model.horse;

import com.equifreight.entity.enums.HorseSex;
import jakarta.validation.ConstraintViolation;
import jakarta.validation.Validation;
import jakarta.validation.Validator;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

import java.math.BigDecimal;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;

/** H-01: name, sex, height, microchip, passport number and declared value are required. */
class HorseRequestValidationTest {

    private static Validator validator;

    @BeforeAll
    static void setUp() {
        validator = Validation.buildDefaultValidatorFactory().getValidator();
    }

    @ParameterizedTest
    @ValueSource(strings = {"name", "sex", "heightHh", "microchip", "passportNo", "declaredValue"})
    void aRequestMissingARequiredFieldIsInvalid(String field) {
        HorseRequest request = complete();
        switch (field) {
            case "name" -> request.setName(" ");
            case "sex" -> request.setSex(null);
            case "heightHh" -> request.setHeightHh(null);
            case "microchip" -> request.setMicrochip("");
            case "passportNo" -> request.setPassportNo(null);
            case "declaredValue" -> request.setDeclaredValue(null);
            default -> throw new IllegalArgumentException(field);
        }

        Set<ConstraintViolation<HorseRequest>> violations = validator.validate(request);

        assertThat(violations).hasSize(1);
        assertThat(violations.iterator().next().getPropertyPath().toString()).isEqualTo(field);
    }

    @Test
    void aCompleteRequestIsValid() {
        assertThat(validator.validate(complete())).isEmpty();
    }

    private static HorseRequest complete() {
        HorseRequest request = new HorseRequest();
        request.setName("Nightfall");
        request.setSex(HorseSex.MARE);
        request.setHeightHh(new BigDecimal("16.0"));
        request.setMicrochip("250259600223311");
        request.setPassportNo("VN-PP-2022-0188");
        request.setDeclaredValue(new BigDecimal("240000"));
        return request;
    }
}
