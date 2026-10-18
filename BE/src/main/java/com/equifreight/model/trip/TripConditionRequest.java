package com.equifreight.model.trip;

import com.equifreight.entity.enums.HorseCondition;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.util.List;
import java.util.UUID;

public record TripConditionRequest(
        @NotNull UUID horseId,
        @NotNull HorseCondition condition,
        Boolean drinking,
        Boolean eating,
        @Size(max = 500) String note,
        @Size(max = 8) List<@NotNull UUID> photoFileIds
) {
}
