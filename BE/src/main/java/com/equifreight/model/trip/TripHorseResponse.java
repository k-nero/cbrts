package com.equifreight.model.trip;

import java.util.UUID;
import lombok.Builder;

@Builder
public record TripHorseResponse(UUID id, String name, String stall) {}
