package com.equifreight.model.horse;

import com.equifreight.entity.enums.HorseCoat;
import com.equifreight.entity.enums.HorseSex;
import com.equifreight.entity.enums.StallType;
import com.equifreight.entity.enums.Temperament;
import jakarta.validation.constraints.*;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDate;

/**
 * Create and full update of a horse. The size class is never sent: the server derives it from the height
 * (and a box stall). Height, microchip and date of birth get their rule checks in HorseService.
 */
@Getter
@Setter
public class HorseRequest {

    @NotBlank
    @Size(max = 80)
    private String name;

    @NotNull
    private HorseSex sex;

    private HorseCoat coat;

    @Size(max = 60)
    private String breed;

    private LocalDate dateOfBirth;

    /**
     * Hands.inches, e.g. 16.2.
     */
    @NotNull
    private BigDecimal heightHh;

    @Min(100)
    @Max(1500)
    private Short weightKg;

    /**
     * 15 digits; spaces are ignored.
     */
    @NotBlank
    private String microchip;

    @NotBlank
    @Size(max = 40)
    private String passportNo;

    /**
     * USD. Insurance is computed on it.
     */
    @NotNull
    @Positive
    @Digits(integer = 12, fraction = 2)
    private BigDecimal declaredValue;

    private Temperament temperament;

    /**
     * Defaults to STANDARD.
     */
    private StallType requiredStall;

    @Size(max = 2000)
    private String handlingNotes;
}
