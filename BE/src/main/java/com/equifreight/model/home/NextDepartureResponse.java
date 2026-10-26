package com.equifreight.model.home;

import java.time.Instant;
import lombok.Builder;

/** The club's next job to leave, or the one on the road. {@code state}: locked, cleared or on-road. */
@Builder
public record NextDepartureResponse(String route, Instant departsAt, String state, Instant arrivesAt) {}
