package com.equifreight.model.job;

import jakarta.validation.constraints.NotNull;
import java.util.List;
import java.util.UUID;

/** The confirmed trip to join (US-F3-18), with the biosecurity warnings the coordinator accepted (US-F3-12). */
public record JoinTripRequest(@NotNull UUID tripId, List<String> acceptedWarnings) {}
