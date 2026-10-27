-- Flow 3 (US-F3-22, US-F7-02): a local road run, between a stable and the cargo terminal in one city, books its
-- vehicle for its own hours, and the vehicle can drive again after a shorter turnaround than after a long trip. A
-- version that doesn't set it uses the default the application keeps.

alter type RatePolicyKey add value 'LOCAL_TURNAROUND_HOURS';
