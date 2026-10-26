package com.equifreight.service.pricing;

import com.equifreight.entity.enums.ServiceClass;
import java.util.List;

/**
 * How the horses fit the priced air class, by width and by weight (BR-Q-16); {@code refusal} is null when they fit,
 * and {@code totalWeightKg} is null while any horse's weight is unknown.
 */
public record StallFit(
        int positions, int widthUsedIn, String refusal, List<ServiceClass> achievableClasses, Integer totalWeightKg) {}
