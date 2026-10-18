package com.equifreight.service.pricing;

import com.equifreight.entity.enums.HorseSex;
import java.math.BigDecimal;
import java.util.UUID;

/** One horse as the price sees it: the request's snapshot plus its size class width. */
public record PricingHorse(
        UUID horseId,
        String name,
        HorseSex sex,
        String sizeClassCode,
        int widthIn,
        boolean withFoal,
        BigDecimal declaredValue) {}
