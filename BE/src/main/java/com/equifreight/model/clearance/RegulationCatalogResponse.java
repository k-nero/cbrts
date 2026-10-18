package com.equifreight.model.clearance;

import java.util.UUID;
import lombok.*;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RegulationCatalogResponse {
    private UUID id;
    private String countryCode;
    private String name;
    private RegulationVersionResponse activeVersion;
}
