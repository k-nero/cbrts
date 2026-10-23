package com.equifreight.model.job;

import java.util.List;

/** The keys of the biosecurity warnings the coordinator accepted when confirming the trip's load (US-F3-12). */
public record ConfirmLoadPlanRequest(List<String> acceptedWarnings) {}
