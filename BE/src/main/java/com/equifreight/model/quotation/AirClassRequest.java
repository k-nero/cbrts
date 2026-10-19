package com.equifreight.model.quotation;

import com.equifreight.entity.enums.ServiceClass;
import jakarta.validation.constraints.NotNull;
import lombok.Builder;

/** The air class to price the draft with. */
@Builder
public record AirClassRequest(@NotNull ServiceClass airClass) {}
