package com.equifreight.model.trip;

import java.util.UUID;
import lombok.Builder;

@Builder
public record TripPhotoResponse(UUID id, String fileName, String contentType, String contentUrl) {}
