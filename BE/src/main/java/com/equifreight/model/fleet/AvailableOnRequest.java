package com.equifreight.model.fleet;

import java.time.LocalDate;

/** PUT /staff/vehicles/{id}/available-on: the date the vehicle is expected back, or null to clear it (US-F7-02). */
public record AvailableOnRequest(LocalDate availableOn) {}
