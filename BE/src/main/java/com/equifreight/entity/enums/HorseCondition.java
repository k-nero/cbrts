package com.equifreight.entity.enums;

/**
 * {@code condition_logs.condition}: the four health categories from docs/requirement.txt.
 * Postgres type: {@code HorseCondition}.
 */
public enum HorseCondition {
    STABLE,
    OFF_FEED,
    STRESSED,
    CLIMATE_CHANGE
}
