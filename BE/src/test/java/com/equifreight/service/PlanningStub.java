package com.equifreight.service;

import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.mock;

import java.util.Map;

/** Planning settings for tests: the published catalog sets none, so every setting is its default. Lenient, as most tests never read them. */
final class PlanningStub {

    private PlanningStub() {}

    static PlanningDefaults planningDefaults() {
        PlanningDefaults defaults = mock(PlanningDefaults.class);
        lenient().when(defaults.current()).thenReturn(PlanningDefaults.of(Map.of()));
        return defaults;
    }
}
