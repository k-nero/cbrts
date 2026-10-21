package com.equifreight.model.estimate;

import com.equifreight.service.RequestEstimator;
import com.equifreight.service.pricing.EstimateStatus;
import java.util.List;
import java.util.Map;

/** The estimator's view to the wizard's response. */
public final class EstimateMapper {

    private EstimateMapper() {}

    public static EstimateResponse toResponse(RequestEstimator.View view) {
        return EstimateResponse.builder()
                .status(view.result().status())
                .low(view.result().low())
                .high(view.result().high())
                .message(view.result().message())
                .assumptions(view.assumptions())
                .versionNo(view.versionNo())
                .options(toOptionsResponse(view.options()))
                .build();
    }

    /** No estimate and no options, with the reason. */
    public static EstimateResponse notReady(EstimateStatus status, String message) {
        return EstimateResponse.builder()
                .status(status)
                .message(message)
                .assumptions(List.of())
                .options(toOptionsResponse(Map.of()))
                .build();
    }

    private static EstimateOptionsResponse toOptionsResponse(Map<String, List<RequestEstimator.Option>> options) {
        return EstimateOptionsResponse.builder()
                .mode(group(options, "mode"))
                .trailer(group(options, "trailer"))
                .airClass(group(options, "airClass"))
                .insurance(group(options, "insurance"))
                .arrivalWindow(group(options, "arrivalWindow"))
                .build();
    }

    private static List<OptionEffectResponse> group(Map<String, List<RequestEstimator.Option>> options, String group) {
        return options.getOrDefault(group, List.of()).stream()
                .map(o -> new OptionEffectResponse(
                        o.value(), o.current(), o.deltaLow(), o.deltaHigh(), o.exact(), o.unavailable()))
                .toList();
    }
}
