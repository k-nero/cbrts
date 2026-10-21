package com.equifreight.model.horse;

import com.equifreight.entity.enums.HorseCoat;
import com.equifreight.entity.enums.HorseSex;
import com.equifreight.entity.enums.StallType;
import com.equifreight.entity.enums.Temperament;
import jakarta.validation.constraints.*;
import java.math.BigDecimal;
import java.time.LocalDate;
import lombok.Builder;

/**
 * Create and full update of a horse. The size class is never sent: the server derives it from the height
 * (and a box stall). Height, microchip and date of birth get their rule checks in HorseService.
 */
@Builder(toBuilder = true)
public record HorseRequest(
        @NotBlank @Size(max = 80) String name,
        @NotNull HorseSex sex,
        HorseCoat coat,
        @Size(max = 60) String breed,
        LocalDate dateOfBirth,
        /**
         * Hands.inches, e.g. 16.2.
         */
        @NotNull BigDecimal heightHh,
        @Min(100) @Max(1500) Short weightKg,
        /**
         * 15 digits; spaces are ignored.
         */
        @NotBlank String microchip,
        @NotBlank @Size(max = 40) String passportNo,
        /**
         * USD. Insurance is computed on it.
         */
        @NotNull @Positive @Digits(integer = 12, fraction = 2)
        BigDecimal declaredValue,

        Temperament temperament,
        /**
         * Defaults to STANDARD.
         */
        StallType requiredStall,
        @Size(max = 2000) String handlingNotes) {}
