package com.equifreight.model.job;

import com.equifreight.entity.enums.HorseSex;
import com.equifreight.entity.enums.StallType;
import com.equifreight.entity.enums.Temperament;
import java.util.UUID;
import lombok.Builder;

@Builder
public record JobHorseResponse(
        UUID id,
        String name,
        HorseSex sex,
        String breed,
        Short weightKg,
        String sizeClassCode,
        StallType requiredStall,
        Temperament temperament,
        String handlingNotes,
        /** On a shared trip's load plan, the job the horse travels under; null elsewhere. */
        String jobCode) {}
