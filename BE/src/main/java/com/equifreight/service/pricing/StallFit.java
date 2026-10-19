package com.equifreight.service.pricing;

import com.equifreight.entity.enums.ServiceClass;
import java.util.List;

/** How the horses fit the priced air class; {@code refusal} is null when they fit. */
public record StallFit(int positions, int widthUsedIn, String refusal, List<ServiceClass> achievableClasses) {}
