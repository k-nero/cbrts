package com.equifreight.service;

import com.equifreight.entity.Corridor;
import com.equifreight.entity.RateCatalogVersion;
import com.equifreight.entity.enums.CatalogStatus;
import com.equifreight.exception.ResourceNotFoundException;
import com.equifreight.model.rate.RateCatalogResponse;
import com.equifreight.model.rate.RateCorridorView;
import com.equifreight.model.rate.RateMapper;
import com.equifreight.repository.CorridorRepository;
import com.equifreight.repository.QuotationRepository;
import com.equifreight.repository.RateCatalogVersionRepository;
import com.equifreight.repository.RateFeeBandRepository;
import com.equifreight.repository.RateLineRepository;
import com.equifreight.repository.RatePolicyRepository;
import com.equifreight.repository.RateServiceClassRepository;
import com.equifreight.repository.RateVolumeBreakRepository;
import com.equifreight.service.pricing.CatalogRows;
import com.equifreight.service.pricing.MissingRate;
import com.equifreight.service.pricing.RateSetLoader;
import com.equifreight.service.pricing.RequiredRates;
import java.time.Clock;
import java.util.List;
import java.util.UUID;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * The transport specialist's rate catalog (US-Q-10, #31): one version for every corridor, edited as a draft and
 * published as the next version. A quotation pins the version it was priced from, so publishing never changes one.
 */
@Service
public class RateCatalogService {

    private final RateCatalogVersionRepository versions;
    private final RateSetLoader loader;
    private final CorridorRepository corridors;
    private final QuotationRepository quotations;
    private final RateLineRepository lines;
    private final RateServiceClassRepository classes;
    private final RateVolumeBreakRepository breaks;
    private final RatePolicyRepository policies;
    private final RateFeeBandRepository feeBands;
    private final AuditService audit;
    private final Clock clock;

    public RateCatalogService(
            RateCatalogVersionRepository versions,
            RateSetLoader loader,
            CorridorRepository corridors,
            QuotationRepository quotations,
            RateLineRepository lines,
            RateServiceClassRepository classes,
            RateVolumeBreakRepository breaks,
            RatePolicyRepository policies,
            RateFeeBandRepository feeBands,
            AuditService audit,
            Clock clock) {
        this.versions = versions;
        this.loader = loader;
        this.corridors = corridors;
        this.quotations = quotations;
        this.lines = lines;
        this.classes = classes;
        this.breaks = breaks;
        this.policies = policies;
        this.feeBands = feeBands;
        this.audit = audit;
        this.clock = clock;
    }

    /** The versions, newest first, and every corridor with its missing-rate count (against the draft if any). */
    @Transactional(readOnly = true)
    public RateCatalogResponse catalog() {
        List<RateCatalogVersion> all = versions.findAllByOrderByVersionNoDesc();
        RateCatalogVersion current = first(all, CatalogStatus.PUBLISHED);
        RateCatalogVersion draft = first(all, CatalogStatus.DRAFT);
        RateCatalogVersion counted = draft != null ? draft : current;
        CatalogRows rows = counted == null ? null : loader.load(counted.getId());
        return RateCatalogResponse.builder()
                .currentVersionId(current == null ? null : current.getId())
                .draftVersionId(draft == null ? null : draft.getId())
                .versions(all.stream()
                        .map(v -> RateMapper.toVersionResponse(v, quotations.countByRateCatalogVersionId(v.getId())))
                        .toList())
                .corridors(corridors.findAll(Sort.by("code")).stream()
                        .map(c -> RateMapper.toCorridorResponse(
                                c, rows == null ? 0 : missing(rows, c).size()))
                        .toList())
                .build();
    }

    /** One corridor's rates in one version, with the rates it lacks. */
    @Transactional(readOnly = true)
    public RateCorridorView corridorView(UUID versionId, UUID corridorId) {
        CatalogRows rows = loader.load(versionId);
        Corridor corridor =
                corridors.findById(corridorId).orElseThrow(() -> ResourceNotFoundException.of("Corridor", corridorId));
        return RateMapper.toCorridorView(rows, corridor, missing(rows, corridor));
    }

    static List<MissingRate> missing(CatalogRows rows, Corridor corridor) {
        return RequiredRates.forCorridor(
                corridor.getMode(),
                corridor.getCode(),
                corridor.getOriginCity(),
                corridor.getDestinationCity(),
                corridor.getCrossings().size(),
                rows.forCorridor(corridor.getId()));
    }

    private static RateCatalogVersion first(List<RateCatalogVersion> all, CatalogStatus status) {
        return all.stream().filter(v -> v.getStatus() == status).findFirst().orElse(null);
    }
}
