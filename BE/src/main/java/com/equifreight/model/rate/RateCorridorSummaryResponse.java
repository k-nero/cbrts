package com.equifreight.model.rate;

import com.equifreight.entity.enums.TransportMode;
import java.util.UUID;
import lombok.*;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RateCorridorSummaryResponse {
    private UUID id;
    private String code;
    private String label;
    private TransportMode mode;
    private String originCity;
    private String destinationCity;
    private Integer distanceKm;
    private Integer borderCrossingCount;
    private String version;
    private boolean hasDraft;
    private Integer missingRatesCount;
}
