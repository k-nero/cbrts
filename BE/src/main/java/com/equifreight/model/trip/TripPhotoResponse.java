package com.equifreight.model.trip;

import java.util.UUID;

public record TripPhotoResponse(UUID id, String fileName, String contentType, String contentUrl) {}
