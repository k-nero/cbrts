package com.equifreight.model.horse;

import com.equifreight.entity.enums.HorseCoat;
import com.equifreight.entity.enums.HorseSex;
import com.equifreight.entity.enums.StallType;
import com.equifreight.entity.enums.Temperament;
import lombok.*;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class HorseResponse {
    private UUID id;
    private String name;
    private HorseCoat coat;
    private String breed;
    private HorseSex sex;
    private LocalDate dateOfBirth;
    private BigDecimal heightHh;
    private Short weightKg;
    private SizeClassResponse sizeClass;
    private String microchip;
    private String passportNo;
    private BigDecimal declaredValue;
    private String valueCurrency;
    private Temperament temperament;
    private StallType requiredStall;
    private String handlingNotes;
    private Instant archivedAt;
    /**
     * Name, microchip, sex, breed, date of birth and coat are locked once she was on a submitted request.
     */
    private boolean identityLocked;
    private Instant createdAt;
    private Instant updatedAt;
}
