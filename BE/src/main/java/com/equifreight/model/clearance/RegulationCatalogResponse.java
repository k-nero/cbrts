package com.equifreight.model.clearance;

import lombok.*;

import java.util.UUID;

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
