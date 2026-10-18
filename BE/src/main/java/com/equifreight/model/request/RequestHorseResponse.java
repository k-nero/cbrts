package com.equifreight.model.request;

import com.equifreight.entity.enums.HorseSex;
import com.equifreight.entity.enums.StallType;
import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;
import lombok.Builder;

/** A horse on a request: the snapshot that prices it, and what its profile still lacks. */
@Builder
public record RequestHorseResponse(
        UUID horseId,
        String name,
        HorseSex sex,
        String sizeClassCode,
        StallType requiredStall,
        BigDecimal declaredValue,
        boolean withFoal,
        boolean archived,
        /** passportNo, microchip, dateOfBirth, heightHh, weightKg: the profile fields still empty. */
        List<String> missing) {}
