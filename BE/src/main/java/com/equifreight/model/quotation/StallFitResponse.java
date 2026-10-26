package com.equifreight.model.quotation;

import com.equifreight.entity.enums.ServiceClass;
import java.util.List;
import lombok.Builder;

/**
 * How the horses fit the priced air class, by width and weight (BR-Q-16); refusal is null when they fit, totalWeightKg
 * null while a weight is unknown or on a quotation issued before weights were kept.
 */
@Builder
public record StallFitResponse(
        int positions, int widthUsedIn, String refusal, List<ServiceClass> achievableClasses, Integer totalWeightKg) {}
