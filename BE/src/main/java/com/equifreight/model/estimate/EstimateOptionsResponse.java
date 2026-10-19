package com.equifreight.model.estimate;

import java.util.List;
import lombok.Builder;

/** The Service and Route steps' choices; a group that doesn't apply to the move is empty. */
@Builder
public record EstimateOptionsResponse(
        List<OptionEffectResponse> mode,
        List<OptionEffectResponse> trailer,
        List<OptionEffectResponse> airClass,
        List<OptionEffectResponse> insurance,
        List<OptionEffectResponse> arrivalWindow) {}
