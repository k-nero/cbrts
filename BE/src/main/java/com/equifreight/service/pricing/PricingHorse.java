package com.equifreight.service.pricing;

import com.equifreight.entity.enums.HorseSex;
import java.math.BigDecimal;
import java.util.UUID;

/**
 * One horse as the price sees it: the request's snapshot plus its size class width (null for an unknown class). The
 * weight is the snapshot's, null when the request was sent before weights were kept (BR-Q-16).
 */
public record PricingHorse(
        UUID horseId,
        String name,
        HorseSex sex,
        String sizeClassCode,
        Integer widthIn,
        boolean withFoal,
        BigDecimal declaredValue,
        Integer weightKg) {}
