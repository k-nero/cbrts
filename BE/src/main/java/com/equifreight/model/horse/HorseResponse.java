package com.equifreight.model.horse;

import com.equifreight.entity.enums.HorseCoat;
import com.equifreight.entity.enums.HorseSex;
import com.equifreight.entity.enums.StallType;
import com.equifreight.entity.enums.Temperament;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;
import lombok.Builder;

@Builder
public record HorseResponse(
        UUID id,
        String name,
        HorseCoat coat,
        String breed,
        HorseSex sex,
        LocalDate dateOfBirth,
        BigDecimal heightHh,
        Short weightKg,
        SizeClassResponse sizeClass,
        String microchip,
        String passportNo,
        BigDecimal declaredValue,
        String valueCurrency,
        Temperament temperament,
        StallType requiredStall,
        String handlingNotes,
        Instant archivedAt,
        /**
         * Name, microchip, sex, breed, date of birth and coat are locked once she was on a submitted request.
         */
        boolean identityLocked,
        Instant createdAt,
        Instant updatedAt) {}
