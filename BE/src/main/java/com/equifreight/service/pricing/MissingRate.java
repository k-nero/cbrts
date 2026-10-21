package com.equifreight.service.pricing;

/** A rate or input the catalog could not supply. {@code group} is null when it is not a ledger line. */
public record MissingRate(String group, String description, String why) {}
