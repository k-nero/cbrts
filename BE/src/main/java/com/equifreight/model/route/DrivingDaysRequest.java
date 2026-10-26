package com.equifreight.model.route;

import jakarta.validation.constraints.NotNull;

/** PUT /staff/corridors/{id}/driving-days: days to drive the route one way, 1 to 30 (US-F7-02). */
public record DrivingDaysRequest(@NotNull Integer drivingDays) {}
