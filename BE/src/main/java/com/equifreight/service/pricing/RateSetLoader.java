package com.equifreight.service.pricing;

import com.equifreight.entity.RateCatalogVersion;
import com.equifreight.exception.ResourceNotFoundException;
import com.equifreight.repository.RateCatalogVersionRepository;
import com.equifreight.repository.RateFeeBandRepository;
import com.equifreight.repository.RateLineRepository;
import com.equifreight.repository.RatePolicyRepository;
import com.equifreight.repository.RateServiceClassRepository;
import com.equifreight.repository.RateVolumeBreakRepository;
import java.util.UUID;
import org.springframework.stereotype.Component;

/** Loads every row of a rate catalog version, for the engine and the Rates page. */
@Component
public class RateSetLoader {

    private final RateCatalogVersionRepository versions;
    private final RateLineRepository lines;
    private final RateServiceClassRepository classes;
    private final RateVolumeBreakRepository breaks;
    private final RatePolicyRepository policies;
    private final RateFeeBandRepository feeBands;

    public RateSetLoader(
            RateCatalogVersionRepository versions,
            RateLineRepository lines,
            RateServiceClassRepository classes,
            RateVolumeBreakRepository breaks,
            RatePolicyRepository policies,
            RateFeeBandRepository feeBands) {
        this.versions = versions;
        this.lines = lines;
        this.classes = classes;
        this.breaks = breaks;
        this.policies = policies;
        this.feeBands = feeBands;
    }

    public CatalogRows load(UUID versionId) {
        RateCatalogVersion version = versions.findById(versionId)
                .orElseThrow(() -> ResourceNotFoundException.of("Rate catalog version", versionId));
        return load(version);
    }

    public CatalogRows load(RateCatalogVersion version) {
        UUID id = version.getId();
        return new CatalogRows(
                version,
                classes.findByVersionId(id),
                lines.findByVersionId(id),
                breaks.findByVersionId(id),
                policies.findByIdVersionId(id),
                feeBands.findByVersionIdOrderByKindAscMinDaysAsc(id));
    }
}
