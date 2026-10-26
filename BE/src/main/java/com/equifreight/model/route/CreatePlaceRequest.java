package com.equifreight.model.route;

import com.equifreight.entity.enums.PlaceKind;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.util.UUID;
import lombok.Builder;

/** A new place in the route catalog: a pickup, delivery or stop point in a city of a country we serve. */
@Builder
public record CreatePlaceRequest(
        @NotBlank @Size(max = 160) String name,
        @NotNull PlaceKind kind,
        @NotBlank @Size(max = 80) String city,
        @NotNull UUID countryId,
        @Size(max = 300) String address) {}
