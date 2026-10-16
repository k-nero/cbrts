package com.equifreight.model.trip;

import com.equifreight.entity.enums.HorseCondition;

import java.util.List;
import java.util.UUID;

public record TripConditionResponse(
        UUID horseId,
        String horseName,
        HorseCondition condition,
        Boolean drinking,
        Boolean eating,
        String note,
        List<TripPhotoResponse> photos
) {}
