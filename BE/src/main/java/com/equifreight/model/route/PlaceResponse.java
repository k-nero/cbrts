package com.equifreight.model.route;

import com.equifreight.entity.enums.PlaceKind;
import java.util.UUID;
import lombok.Builder;

/** A pickup or delivery point the customer can choose. */
@Builder
public record PlaceResponse(
        UUID id, String name, PlaceKind kind, String city, String countryCode, String countryName) {}
