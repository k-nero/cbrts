package com.equifreight.model.route;

import java.util.UUID;
import lombok.Builder;

/** A country we serve, for the route catalog's place and border crossing forms. */
@Builder
public record CountryOptionResponse(UUID id, String code, String name) {}
