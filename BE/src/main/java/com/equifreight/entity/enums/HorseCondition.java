package com.equifreight.entity.enums;

/**
 * {@code condition_logs.condition}.
 */
public enum HorseCondition {
    STABLE,
    OFF_FEED,
    STRESSED,
    CLIMATE_CHANGE,
    /** Legacy values retained so existing condition records remain readable. */
    SOUND,
    WATCH,
    CONCERN
}
