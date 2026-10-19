package com.equifreight.model.quotation;

import com.equifreight.entity.enums.ServiceClass;
import java.util.List;
import lombok.Builder;

/** How the horses fit the priced air class; refusal is null when they fit. */
@Builder
public record StallFitResponse(int positions, int widthUsedIn, String refusal, List<ServiceClass> achievableClasses) {}
