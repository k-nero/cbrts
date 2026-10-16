package com.equifreight.model.request;

import com.equifreight.entity.enums.HorseSex;
import com.equifreight.entity.enums.StallType;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

/** A horse on a request: the snapshot that prices it, and what its profile still lacks. */
@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RequestHorseResponse {
    private UUID horseId;
    private String name;
    private HorseSex sex;
    private String sizeClassCode;
    private StallType requiredStall;
    private BigDecimal declaredValue;
    private boolean withFoal;
    private boolean archived;
    /** passportNo, microchip, dateOfBirth, heightHh, weightKg: the profile fields still empty. */
    private List<String> missing;
}
