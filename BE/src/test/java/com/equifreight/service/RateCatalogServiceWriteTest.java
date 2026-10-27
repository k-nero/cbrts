package com.equifreight.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.equifreight.configuration.BusinessTime;
import com.equifreight.entity.Corridor;
import com.equifreight.entity.RateCatalogVersion;
import com.equifreight.entity.RateFeeBand;
import com.equifreight.entity.RateLine;
import com.equifreight.entity.RatePolicy;
import com.equifreight.entity.RateServiceClass;
import com.equifreight.entity.RateVolumeBreak;
import com.equifreight.entity.User;
import com.equifreight.entity.enums.CatalogStatus;
import com.equifreight.entity.enums.FeeBandKind;
import com.equifreight.entity.enums.RateBasis;
import com.equifreight.entity.enums.RateCertainty;
import com.equifreight.entity.enums.RatePolicyKey;
import com.equifreight.entity.enums.ServiceClass;
import com.equifreight.entity.enums.TrailerType;
import com.equifreight.entity.enums.TransportMode;
import com.equifreight.exception.BusinessException;
import com.equifreight.exception.ConflictException;
import com.equifreight.model.rate.DraftResult;
import com.equifreight.model.rate.PublishRequest;
import com.equifreight.model.rate.RateLineRequest;
import com.equifreight.model.rate.ServiceClassRequest;
import com.equifreight.model.rate.VolumeBreakRequest;
import com.equifreight.repository.CorridorRepository;
import com.equifreight.repository.QuotationRepository;
import com.equifreight.repository.RateCatalogVersionRepository;
import com.equifreight.repository.RateFeeBandRepository;
import com.equifreight.repository.RateLineRepository;
import com.equifreight.repository.RatePolicyRepository;
import com.equifreight.repository.RateServiceClassRepository;
import com.equifreight.repository.RateVolumeBreakRepository;
import com.equifreight.service.pricing.CatalogRows;
import com.equifreight.service.pricing.RateSetLoader;
import java.math.BigDecimal;
import java.time.Clock;
import java.time.Instant;
import java.util.ArrayList;
import java.util.EnumMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.function.Consumer;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

/** US-Q-10 (#31): editing a draft rate catalog and publishing it as the next version. */
class RateCatalogServiceWriteTest {

    static final Instant NOW = Instant.parse("2026-10-19T03:40:00Z");

    RateCatalogVersionRepository versions;
    RateSetLoader loader;
    CorridorRepository corridors;
    QuotationRepository quotations;
    RateLineRepository lines;
    RateServiceClassRepository classes;
    RateVolumeBreakRepository breaks;
    RatePolicyRepository policies;
    RateFeeBandRepository feeBands;
    AuditService audit;
    RateCatalogService service;

    User lan;
    RateCatalogVersion v2;
    RateCatalogVersion draft;
    Corridor pnhHkg;
    Corridor hanVte;
    List<RateLine> draftLines;

    @BeforeEach
    void setUp() {
        versions = mock(RateCatalogVersionRepository.class);
        loader = mock(RateSetLoader.class);
        corridors = mock(CorridorRepository.class);
        quotations = mock(QuotationRepository.class);
        lines = mock(RateLineRepository.class);
        classes = mock(RateServiceClassRepository.class);
        breaks = mock(RateVolumeBreakRepository.class);
        policies = mock(RatePolicyRepository.class);
        feeBands = mock(RateFeeBandRepository.class);
        audit = mock(AuditService.class);
        service = new RateCatalogService(
                versions,
                loader,
                corridors,
                quotations,
                lines,
                classes,
                breaks,
                policies,
                feeBands,
                audit,
                Clock.fixed(NOW, BusinessTime.ZONE));

        lan = new User();
        lan.setId(UUID.randomUUID());
        lan.setFirstName("Thị Lan");
        lan.setLastName("Nguyễn");
        v2 = version(2, CatalogStatus.PUBLISHED);
        draft = version(3, CatalogStatus.DRAFT);
        pnhHkg = corridor("AIR PNH → HKG", TransportMode.AIR);
        hanVte = corridor("RD HAN → VTE", TransportMode.ROAD);
        draftLines = new ArrayList<>();

        when(versions.findFirstByStatusOrderByVersionNoDesc(CatalogStatus.PUBLISHED))
                .thenReturn(Optional.of(v2));
        when(versions.findByStatus(CatalogStatus.DRAFT)).thenReturn(Optional.of(draft));
        when(versions.lockByStatus(CatalogStatus.DRAFT)).thenReturn(Optional.of(draft));
        when(versions.lockByStatus(CatalogStatus.PUBLISHED)).thenReturn(Optional.of(v2));
        when(versions.maxVersionNo()).thenReturn(2);
        when(versions.save(any())).thenAnswer(i -> i.getArgument(0));
        when(versions.saveAndFlush(any())).thenAnswer(i -> {
            RateCatalogVersion v = i.getArgument(0);
            if (v.getId() == null) {
                v.setId(UUID.randomUUID());
            }
            return v;
        });
        when(lines.save(any())).thenAnswer(i -> i.getArgument(0));
        when(lines.findByVersionId(draft.getId())).thenReturn(draftLines);
        when(classes.save(any())).thenAnswer(i -> i.getArgument(0));
        when(corridors.findById(pnhHkg.getId())).thenReturn(Optional.of(pnhHkg));
        when(corridors.findById(hanVte.getId())).thenReturn(Optional.of(hanVte));
        when(loader.load(any(UUID.class))).thenAnswer(i -> emptyRows(i.getArgument(0)));
    }

    CatalogRows emptyRows(UUID versionId) {
        RateCatalogVersion v = versionId.equals(draft.getId()) ? draft : v2;
        return new CatalogRows(v, List.of(), List.of(), List.of(), List.of(), List.of());
    }

    static RateCatalogVersion version(int no, CatalogStatus status) {
        RateCatalogVersion v = new RateCatalogVersion();
        v.setId(UUID.randomUUID());
        v.setVersionNo(no);
        v.setStatus(status);
        return v;
    }

    static Corridor corridor(String code, TransportMode mode) {
        Corridor c = new Corridor();
        c.setId(UUID.randomUUID());
        c.setCode(code);
        c.setMode(mode);
        c.setOriginCity("From");
        c.setDestinationCity("To");
        c.setDistanceKm(500);
        return c;
    }

    static RateLineRequest lineRequest(UUID corridorId, String code, RateBasis basis) {
        return new RateLineRequest(
                corridorId,
                code,
                "D",
                "A line",
                basis,
                null,
                null,
                new BigDecimal("100"),
                null,
                null,
                RateCertainty.FIXED,
                null);
    }

    static RateLineRequest with(RateLineRequest r, Consumer<RateLineRequest.RateLineRequestBuilder> change) {
        RateLineRequest.RateLineRequestBuilder b = r.toBuilder();
        change.accept(b);
        return b.build();
    }

    void assertRefused(Runnable call, String code, String message) {
        assertThatThrownBy(call::run)
                .isInstanceOf(BusinessException.class)
                .hasMessage(message)
                .extracting("code")
                .isEqualTo(code);
    }

    // --- drafts -------------------------------------------------------------------------------------------

    @Test
    void createDraftCopiesEveryRowAndNumbersTheNextVersion() {
        when(versions.findByStatus(CatalogStatus.DRAFT)).thenReturn(Optional.empty());
        RateLine groom = new RateLine();
        groom.setVersion(v2);
        groom.setCorridor(pnhHkg);
        groom.setCode("GROOM");
        groom.setGroupCode("D");
        groom.setDescription("Flying groom");
        groom.setBasis(RateBasis.PER_HOUR);
        groom.setRate(new BigDecimal("95"));
        groom.setDefaultQuantity(new BigDecimal("2"));
        groom.setCertainty(RateCertainty.ESTIMATED);
        groom.setEstimateNote("Billed by the hour.");
        groom.setAppliesToTrailer(TrailerType.PRIVATE);
        RateServiceClass business = new RateServiceClass();
        business.setVersion(v2);
        business.setCorridor(pnhHkg);
        business.setServiceClass(ServiceClass.BUSINESS);
        business.setWidthPerHorseIn((short) 48);
        business.setHorsesPerPosition((short) 2);
        business.setPositionRate(new BigDecimal("16800"));
        RateVolumeBreak band = new RateVolumeBreak();
        band.setVersion(v2);
        band.setMinHorses((short) 1);
        band.setDiscountPct(BigDecimal.ZERO);
        RatePolicy fuel = new RatePolicy();
        fuel.setVersion(v2);
        fuel.setKey(RatePolicyKey.FUEL_PCT);
        fuel.setValue(new BigDecimal("18"));
        RateFeeBand cancel = new RateFeeBand();
        cancel.setVersion(v2);
        cancel.setKind(FeeBandKind.CANCELLATION);
        cancel.setMinDays((short) 30);
        cancel.setValue(BigDecimal.TEN);
        when(loader.load(v2.getId()))
                .thenReturn(new CatalogRows(
                        v2, List.of(business), List.of(groom), List.of(band), List.of(fuel), List.of(cancel)));

        DraftResult result = service.createDraft(lan);

        assertThat(result.created()).isTrue();
        assertThat(result.version().versionNo()).isEqualTo(3);
        assertThat(result.version().status()).isEqualTo(CatalogStatus.DRAFT);
        assertThat(result.version().lastEditedBy()).isEqualTo("Nguyễn Thị Lan");

        ArgumentCaptor<List<RateLine>> copiedLines = listCaptor();
        verify(lines).saveAll(copiedLines.capture());
        RateLine copy = copiedLines.getValue().getFirst();
        assertThat(copy.getVersion().getVersionNo()).isEqualTo(3);
        assertThat(copy)
                .usingRecursiveComparison()
                .ignoringFields("version", "id", "createdAt", "updatedAt")
                .isEqualTo(groom);
        ArgumentCaptor<List<RateServiceClass>> copiedClasses = listCaptor();
        verify(classes).saveAll(copiedClasses.capture());
        assertThat(copiedClasses.getValue().getFirst().getPositionRate()).isEqualByComparingTo("16800");
        ArgumentCaptor<List<RateVolumeBreak>> copiedBreaks = listCaptor();
        verify(breaks).saveAll(copiedBreaks.capture());
        assertThat(copiedBreaks.getValue()).hasSize(1);
        ArgumentCaptor<List<RatePolicy>> copiedPolicies = listCaptor();
        verify(policies).saveAll(copiedPolicies.capture());
        assertThat(copiedPolicies.getValue().getFirst().getKey()).isEqualTo(RatePolicyKey.FUEL_PCT);
        assertThat(copiedPolicies.getValue().getFirst().getVersion().getVersionNo())
                .isEqualTo(3);
        ArgumentCaptor<List<RateFeeBand>> copiedBands = listCaptor();
        verify(feeBands).saveAll(copiedBands.capture());
        assertThat(copiedBands.getValue().getFirst().getKind()).isEqualTo(FeeBandKind.CANCELLATION);
    }

    @SuppressWarnings({"unchecked", "rawtypes"})
    static <T> ArgumentCaptor<List<T>> listCaptor() {
        return (ArgumentCaptor) ArgumentCaptor.forClass(List.class);
    }

    @Test
    void createDraftReturnsTheExistingDraft() {
        DraftResult result = service.createDraft(lan);

        assertThat(result.created()).isFalse();
        assertThat(result.version().id()).isEqualTo(draft.getId());
        verify(lines, never()).saveAll(anyList());
    }

    @Test
    void createDraftWithNothingPublishedIsAConflict() {
        when(versions.findByStatus(CatalogStatus.DRAFT)).thenReturn(Optional.empty());
        when(versions.findFirstByStatusOrderByVersionNoDesc(CatalogStatus.PUBLISHED))
                .thenReturn(Optional.empty());
        when(versions.lockByStatus(CatalogStatus.PUBLISHED)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.createDraft(lan))
                .isInstanceOf(ConflictException.class)
                .hasMessage("No rate catalog is published yet.")
                .extracting("code")
                .isEqualTo("NO_PUBLISHED_CATALOG");
    }

    @Test
    void publishMakesTheDraftCurrentAndRetiresThePrevious() {
        var published = service.publish(lan, new PublishRequest("  Business rate for PNH → HKG "));

        assertThat(v2.getStatus()).isEqualTo(CatalogStatus.RETIRED);
        assertThat(draft.getStatus()).isEqualTo(CatalogStatus.PUBLISHED);
        assertThat(draft.getPublishedAt()).isEqualTo(NOW);
        assertThat(draft.getPublishedBy()).isEqualTo(lan);
        assertThat(draft.getChangeNote()).isEqualTo("Business rate for PNH → HKG");
        assertThat(published.versionNo()).isEqualTo(3);
        verify(audit)
                .recordDecision(
                        eq(lan),
                        eq("RATE_CATALOG_PUBLISHED"),
                        eq("Rate catalog v3 published: Business rate for PNH → HKG"),
                        eq("RATE_CATALOG_VERSION"),
                        eq(draft.getId()),
                        eq("Rates v3"),
                        isNull(),
                        eq("{\"status\":\"DRAFT\"}"),
                        eq("{\"status\":\"PUBLISHED\"}"));
    }

    @Test
    void publishNeedsAChangeNote() {
        assertRefused(
                () -> service.publish(lan, new PublishRequest("   ")),
                "CHANGE_NOTE",
                "Say what changed in this version.");
        assertRefused(
                () -> service.publish(lan, new PublishRequest("x".repeat(501))),
                "CHANGE_NOTE",
                "The change note must be 500 characters or fewer.");
        assertThat(draft.getStatus()).isEqualTo(CatalogStatus.DRAFT);
    }

    @Test
    void discardDeletesTheDraftAndAudits() {
        service.discardDraft(lan);

        verify(versions).delete(draft);
        verify(audit)
                .recordDecision(
                        eq(lan),
                        eq("RATE_CATALOG_DRAFT_DISCARDED"),
                        eq("Rate catalog draft v3 discarded"),
                        eq("RATE_CATALOG_VERSION"),
                        eq(draft.getId()),
                        eq("Rates v3"),
                        isNull(),
                        isNull(),
                        isNull());
    }

    @Test
    void aWriteWithNoDraftIsNoDraft() {
        when(versions.findByStatus(CatalogStatus.DRAFT)).thenReturn(Optional.empty());
        when(versions.lockByStatus(CatalogStatus.DRAFT)).thenReturn(Optional.empty());
        List<Runnable> writes = List.of(
                () -> service.discardDraft(lan),
                () -> service.publish(lan, new PublishRequest("note")),
                () -> service.putServiceClass(
                        lan,
                        pnhHkg.getId(),
                        ServiceClass.BUSINESS,
                        new ServiceClassRequest((short) 48, new BigDecimal("16800"))),
                () -> service.deleteServiceClass(lan, pnhHkg.getId(), ServiceClass.BUSINESS),
                () -> service.addLine(lan, lineRequest(pnhHkg.getId(), "GROOM", RateBasis.PER_THREE_HORSES), null),
                () -> service.updateLine(
                        lan, UUID.randomUUID(), lineRequest(pnhHkg.getId(), "GROOM", RateBasis.PER_THREE_HORSES), null),
                () -> service.deleteLine(lan, UUID.randomUUID(), pnhHkg.getId()),
                () -> service.putVolumeBreaks(
                        lan, null, List.of(new VolumeBreakRequest((short) 1, null, BigDecimal.ZERO)), pnhHkg.getId()),
                () -> service.putPolicies(lan, Map.of(RatePolicyKey.FUEL_PCT, BigDecimal.TEN), pnhHkg.getId()));
        for (Runnable write : writes) {
            assertThatThrownBy(write::run)
                    .isInstanceOf(ConflictException.class)
                    .hasMessage("There is no draft to change. Create a draft first.")
                    .extracting("code")
                    .isEqualTo("NO_DRAFT");
        }
    }

    // --- service classes ----------------------------------------------------------------------------------

    @Test
    void horsesPerPositionIsDerivedFromTheWidth() {
        int[][] cases = {{48, 2}, {32, 3}, {96, 1}};
        for (int[] c : cases) {
            when(classes.findByVersionIdAndCorridorIdAndServiceClass(
                            draft.getId(), pnhHkg.getId(), ServiceClass.BUSINESS))
                    .thenReturn(Optional.empty());
            service.putServiceClass(
                    lan,
                    pnhHkg.getId(),
                    ServiceClass.BUSINESS,
                    new ServiceClassRequest((short) c[0], new BigDecimal("16800")));
        }
        ArgumentCaptor<RateServiceClass> saved = ArgumentCaptor.forClass(RateServiceClass.class);
        verify(classes, org.mockito.Mockito.times(3)).save(saved.capture());
        assertThat(saved.getAllValues())
                .extracting(RateServiceClass::getHorsesPerPosition)
                .containsExactly((short) 2, (short) 3, (short) 1);
        assertThat(saved.getAllValues().getFirst().getVersion()).isEqualTo(draft);
    }

    @Test
    void serviceClassesAreForAirCorridorsWithAPositionWidth() {
        ServiceClassRequest ok = new ServiceClassRequest((short) 48, new BigDecimal("16800"));
        assertRefused(
                () -> service.putServiceClass(lan, hanVte.getId(), ServiceClass.BUSINESS, ok),
                "SERVICE_CLASS",
                "Only an air corridor has stall classes.");
        assertRefused(
                () -> service.putServiceClass(
                        lan,
                        pnhHkg.getId(),
                        ServiceClass.BUSINESS,
                        new ServiceClassRequest((short) 97, new BigDecimal("16800"))),
                "WIDTH_PER_HORSE_IN",
                "The width per horse must be 1 to 96 in.");
    }

    // --- lines ----------------------------------------------------------------------------------------------

    @Test
    void lineRulesAreChecked() {
        UUID air = pnhHkg.getId();
        UUID road = hanVte.getId();
        assertRefused(
                () -> service.addLine(lan, lineRequest(air, "STALL", RateBasis.PER_POSITION), null),
                "BASIS",
                "Stall positions are priced in the service class table, not as a line.");
        assertRefused(
                () -> service.addLine(lan, lineRequest(air, "ROAD", RateBasis.PER_KM), null),
                "BASIS",
                "Air corridors price the flight by stall position; a road transfer to the terminal is per shipment.");
        assertRefused(
                () -> service.addLine(lan, lineRequest(air, "VET", RateBasis.VET_ESCORT), null),
                "BASIS",
                "An air move's vet is the flight vet line; a vet escort on request is for road corridors.");
        assertRefused(
                () -> service.addLine(
                        lan,
                        with(lineRequest(road, "X", RateBasis.PER_HORSE), b -> b.appliesToTrailer(TrailerType.SHARED)),
                        null),
                "APPLIES_TO_TRAILER",
                "Only a per-km line can be for one trailer kind.");
        assertRefused(
                () -> service.addLine(
                        lan, with(lineRequest(road, "X", RateBasis.PER_HORSE), b -> b.minCharge(BigDecimal.ONE)), null),
                "MIN_CHARGE",
                "Only a per-km line has a minimum charge.");
        assertRefused(
                () -> service.addLine(lan, lineRequest(road, "WAIT", RateBasis.PER_HOUR), null),
                "DEFAULT_QUANTITY",
                "A per-hour line needs the hours it assumes.");
        assertRefused(
                () -> service.addLine(
                        lan,
                        with(lineRequest(road, "X", RateBasis.PER_HORSE), b -> b.certainty(RateCertainty.ESTIMATED)),
                        null),
                "ESTIMATE_NOTE",
                "Say why an estimated line may vary.");
        verify(lines, never()).save(any());
    }

    @Test
    void anAddedLineBelongsToTheDraftAndRecordsTheEditor() {
        RateLineRequest request = with(
                lineRequest(hanVte.getId(), "ROAD_PRIVATE", RateBasis.PER_KM),
                b -> b.group("C").appliesToTrailer(TrailerType.PRIVATE).minCharge(new BigDecimal("400")));

        service.addLine(lan, request, null);

        ArgumentCaptor<RateLine> saved = ArgumentCaptor.forClass(RateLine.class);
        verify(lines).save(saved.capture());
        RateLine line = saved.getValue();
        assertThat(line.getVersion()).isEqualTo(draft);
        assertThat(line.getCorridor()).isEqualTo(hanVte);
        assertThat(line.getAppliesToTrailer()).isEqualTo(TrailerType.PRIVATE);
        assertThat(line.getMinCharge()).isEqualByComparingTo("400");
        assertThat(draft.getLastEditedBy()).isEqualTo(lan);
        assertThat(draft.getUpdatedAt()).isEqualTo(NOW);
        verify(loader).load(draft.getId());
    }

    @Test
    void aDuplicateCodeIsAConflict() {
        RateLine existing = new RateLine();
        existing.setId(UUID.randomUUID());
        existing.setVersion(draft);
        existing.setCorridor(null);
        existing.setCode("GROOM");
        draftLines.add(existing);

        assertThatThrownBy(() ->
                        service.addLine(lan, lineRequest(null, "GROOM", RateBasis.PER_THREE_HORSES), pnhHkg.getId()))
                .isInstanceOf(ConflictException.class)
                .hasMessage("GROOM is already a line for every corridor.")
                .extracting("code")
                .isEqualTo("DUPLICATE_RATE_CODE");

        // The same code on one corridor is a different line: it replaces the every-corridor one there.
        service.addLine(lan, lineRequest(pnhHkg.getId(), "GROOM", RateBasis.PER_THREE_HORSES), null);
        verify(lines).save(any());
    }

    @Test
    void anEveryCorridorLineNeedsACorridorToShow() {
        assertRefused(
                () -> service.addLine(lan, lineRequest(null, "GROOM", RateBasis.PER_THREE_HORSES), null),
                "CORRIDOR",
                "Choose the corridor to show after the change.");
    }

    @Test
    void aLineOutsideTheDraftIsNotFound() {
        UUID other = UUID.randomUUID();
        when(lines.findById(other)).thenReturn(Optional.empty());
        assertThatThrownBy(() -> service.deleteLine(lan, other, pnhHkg.getId()))
                .isInstanceOf(com.equifreight.exception.ResourceNotFoundException.class);

        RateLine published = new RateLine();
        published.setId(UUID.randomUUID());
        published.setVersion(v2);
        when(lines.findById(published.getId())).thenReturn(Optional.of(published));
        assertThatThrownBy(() -> service.deleteLine(lan, published.getId(), pnhHkg.getId()))
                .isInstanceOf(com.equifreight.exception.ResourceNotFoundException.class);
    }

    // --- volume breaks and policies ------------------------------------------------------------------------

    static VolumeBreakRequest band(Integer min, Integer max, String pct) {
        return new VolumeBreakRequest(
                min == null ? null : min.shortValue(), max == null ? null : max.shortValue(), new BigDecimal(pct));
    }

    @Test
    void bandsMustStartAtOneFollowOnAndEndOpen() {
        UUID view = pnhHkg.getId();
        String code = "INVALID_VOLUME_BREAKS";
        assertRefused(
                () -> service.putVolumeBreaks(lan, null, List.of(band(2, null, "0")), view),
                code,
                "The first band must start at 1 horse.");
        assertRefused(
                () -> service.putVolumeBreaks(lan, null, List.of(band(1, 1, "0"), band(3, null, "5")), view),
                code,
                "The bands must follow on without gaps: 1 is followed by 3+.");
        assertRefused(
                () -> service.putVolumeBreaks(lan, null, List.of(band(1, 3, "0"), band(3, null, "5")), view),
                code,
                "The bands overlap at 3 horses.");
        assertRefused(
                () -> service.putVolumeBreaks(lan, null, List.of(band(1, 1, "0"), band(2, 7, "5")), view),
                code,
                "The last band must be open-ended (2+).");
        assertRefused(
                () -> service.putVolumeBreaks(lan, null, List.of(band(1, null, "101")), view),
                code,
                "A discount must be between 0 and 100%.");
        assertRefused(
                () -> service.putVolumeBreaks(
                        lan, null, List.of(band(1, 1, "0"), band(4, 2, "5"), band(5, null, "5")), view),
                code,
                "A band can't end before it starts: 4–2.");
        assertRefused(
                () -> service.putVolumeBreaks(lan, null, List.of(), view),
                code,
                "The first band must start at 1 horse.");
        verify(breaks, never()).deleteGlobalBands(any());
    }

    @Test
    void validBandsReplaceTheGlobalOnes() {
        service.putVolumeBreaks(
                lan,
                null,
                List.of(band(1, 1, "0"), band(2, 3, "5"), band(4, 7, "10"), band(8, null, "15")),
                pnhHkg.getId());

        verify(breaks).deleteGlobalBands(draft.getId());
        ArgumentCaptor<List<RateVolumeBreak>> saved = listCaptor();
        verify(breaks).saveAll(saved.capture());
        assertThat(saved.getValue()).extracting(b -> b.getCorridor()).containsOnlyNulls();
        assertThat(saved.getValue()).hasSize(4);
    }

    @Test
    void anEmptyBandListRemovesTheCorridorsOwnBands() {
        service.putVolumeBreaks(lan, pnhHkg.getId(), List.of(), pnhHkg.getId());

        verify(breaks).deleteCorridorBands(draft.getId(), pnhHkg.getId());
        ArgumentCaptor<List<RateVolumeBreak>> saved = listCaptor();
        verify(breaks).saveAll(saved.capture());
        assertThat(saved.getValue()).isEmpty();
    }

    @Test
    void policyRangesAreChecked() {
        UUID view = pnhHkg.getId();
        assertRefused(
                () -> service.putPolicies(lan, Map.of(RatePolicyKey.FUEL_PCT, new BigDecimal("100.5")), view),
                "FUEL_PCT",
                "Fuel surcharge must be between 0 and 100%.");
        assertRefused(
                () -> service.putPolicies(lan, Map.of(RatePolicyKey.QUOTE_VALIDITY_DAYS, new BigDecimal("31")), view),
                "QUOTE_VALIDITY_DAYS",
                "Quote validity must be 1 to 30 days.");
        assertRefused(
                () -> service.putPolicies(lan, Map.of(RatePolicyKey.FLIGHT_VET_MIN_HORSES, BigDecimal.ZERO), view),
                "FLIGHT_VET_MIN_HORSES",
                "The flight vet threshold must be at least 1 horse.");
        assertRefused(
                () -> service.putPolicies(lan, Map.of(RatePolicyKey.HIGH_VALUE_THRESHOLD, new BigDecimal("-1")), view),
                "HIGH_VALUE_THRESHOLD",
                "The high value threshold can't be negative.");
        Map<RatePolicyKey, BigDecimal> nullValue = new EnumMap<>(RatePolicyKey.class);
        nullValue.put(RatePolicyKey.CONTINGENCY_PCT, null);
        assertRefused(() -> service.putPolicies(lan, nullValue, view), "CONTINGENCY_PCT", "Contingency needs a value.");
        verify(policies, never()).save(any());
    }

    @Test
    void theWeightLimitsAreWholeKilogramsUpTo99999() {
        UUID view = pnhHkg.getId();
        assertRefused(
                () -> service.putPolicies(lan, Map.of(RatePolicyKey.STALL_PAYLOAD_KG, BigDecimal.ZERO), view),
                "STALL_PAYLOAD_KG",
                "The stall payload must be a whole number of kilograms from 1 to 99,999.");
        assertRefused(
                () -> service.putPolicies(
                        lan, Map.of(RatePolicyKey.AIR_SHIPMENT_MAX_KG, new BigDecimal("100000")), view),
                "AIR_SHIPMENT_MAX_KG",
                "The air shipment limit must be a whole number of kilograms from 1 to 99,999.");
        assertRefused(
                () -> service.putPolicies(lan, Map.of(RatePolicyKey.STALL_PAYLOAD_KG, new BigDecimal("5504.5")), view),
                "STALL_PAYLOAD_KG",
                "The stall payload must be a whole number of kilograms from 1 to 99,999.");
        verify(policies, never()).save(any());

        Map<RatePolicyKey, BigDecimal> limits = new EnumMap<>(RatePolicyKey.class);
        limits.put(RatePolicyKey.STALL_PAYLOAD_KG, new BigDecimal("5504"));
        limits.put(RatePolicyKey.AIR_SHIPMENT_MAX_KG, new BigDecimal("20000"));
        service.putPolicies(lan, limits, view);
        verify(policies, times(2)).save(any());
    }

    @Test
    void policiesAreUpsertedOnTheDraft() {
        RatePolicy fuel = new RatePolicy();
        fuel.setVersion(draft);
        fuel.setKey(RatePolicyKey.FUEL_PCT);
        fuel.setValue(new BigDecimal("18"));
        when(policies.findByVersionIdAndKey(draft.getId(), RatePolicyKey.FUEL_PCT))
                .thenReturn(Optional.of(fuel));
        when(policies.findByVersionIdAndKey(draft.getId(), RatePolicyKey.DEPOSIT_PCT))
                .thenReturn(Optional.empty());

        Map<RatePolicyKey, BigDecimal> values = new EnumMap<>(RatePolicyKey.class);
        values.put(RatePolicyKey.FUEL_PCT, new BigDecimal("20"));
        values.put(RatePolicyKey.DEPOSIT_PCT, new BigDecimal("30"));
        service.putPolicies(lan, values, pnhHkg.getId());

        ArgumentCaptor<RatePolicy> saved = ArgumentCaptor.forClass(RatePolicy.class);
        verify(policies, org.mockito.Mockito.times(2)).save(saved.capture());
        assertThat(saved.getAllValues())
                .extracting(p -> p.getKey(), p -> p.getValue().toPlainString())
                .containsExactly(
                        org.assertj.core.groups.Tuple.tuple(RatePolicyKey.FUEL_PCT, "20"),
                        org.assertj.core.groups.Tuple.tuple(RatePolicyKey.DEPOSIT_PCT, "30"));
        assertThat(saved.getAllValues().get(1).getVersion()).isEqualTo(draft);
    }

    @Test
    void everyWriteRecordsWhoEditedLast() {
        User other = new User();
        other.setId(UUID.randomUUID());
        service.putPolicies(other, Map.of(), pnhHkg.getId());
        assertThat(draft.getLastEditedBy()).isEqualTo(other);
        assertThat(draft.getUpdatedAt()).isEqualTo(NOW);
        verify(versions).save(draft);
    }

    // --- review fixes ------------------------------------------------------------------------------------

    /** A write waits for the draft row lock, so after a concurrent publish it finds no draft. */
    @Test
    void writesReadTheDraftUnderALock() {
        when(versions.lockByStatus(CatalogStatus.DRAFT)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.putPolicies(lan, Map.of(), pnhHkg.getId()))
                .isInstanceOf(ConflictException.class)
                .extracting("code")
                .isEqualTo("NO_DRAFT");
        assertThatThrownBy(() -> service.publish(lan, new PublishRequest("note")))
                .isInstanceOf(ConflictException.class)
                .extracting("code")
                .isEqualTo("NO_DRAFT");
        assertThatThrownBy(() -> service.discardDraft(lan))
                .isInstanceOf(ConflictException.class)
                .extracting("code")
                .isEqualTo("NO_DRAFT");
    }

    @Test
    void aSexLineDescriptionLeavesRoomForTheSex() {
        RateLineRequest tooLong = with(
                lineRequest(pnhHkg.getId(), "ISO", RateBasis.PER_DAY),
                b -> b.appliesToSex(com.equifreight.entity.enums.HorseSex.STALLION)
                        .description("x".repeat(150)));
        assertRefused(
                () -> service.addLine(lan, tooLong, null),
                "DESCRIPTION",
                "A line for one sex can have at most 149 characters: the quotation adds the sex to it.");

        RateLineRequest fits = with(tooLong, b -> b.description("x".repeat(149)));
        service.addLine(lan, fits, null);
        verify(lines).save(any());
    }

    // --- deferred minors ---------------------------------------------------------------------------------

    /** Only per-horse and per-day lines price horses one by one, so only they can be for one sex. */
    @Test
    void onlyPerHorseAndPerDayLinesCanBeForOneSex() {
        for (RateBasis basis : List.of(
                RateBasis.PER_SHIPMENT,
                RateBasis.PER_CROSSING,
                RateBasis.PER_HOUR,
                RateBasis.PER_THREE_HORSES,
                RateBasis.FLIGHT_VET)) {
            RateLineRequest request = with(
                    lineRequest(hanVte.getId(), "X", basis),
                    b -> b.appliesToSex(com.equifreight.entity.enums.HorseSex.MARE)
                            .defaultQuantity(BigDecimal.ONE));
            assertRefused(
                    () -> service.addLine(lan, request, null),
                    "APPLIES_TO_SEX",
                    "Only a per-horse or per-day line can be for one sex.");
        }
        assertRefused(
                () -> service.addLine(
                        lan,
                        with(
                                lineRequest(hanVte.getId(), "X", RateBasis.PER_KM),
                                b -> b.appliesToSex(com.equifreight.entity.enums.HorseSex.MARE)),
                        null),
                "APPLIES_TO_SEX",
                "Only a per-horse or per-day line can be for one sex.");
        verify(lines, never()).save(any());

        service.addLine(
                lan,
                with(
                        lineRequest(hanVte.getId(), "ISO_MARE", RateBasis.PER_DAY),
                        b -> b.appliesToSex(com.equifreight.entity.enums.HorseSex.MARE)),
                null);
        service.addLine(
                lan,
                with(
                        lineRequest(hanVte.getId(), "VET_MARE", RateBasis.PER_HORSE),
                        b -> b.appliesToSex(com.equifreight.entity.enums.HorseSex.MARE)),
                null);
        verify(lines, org.mockito.Mockito.times(2)).save(any());
    }

    @Test
    void anEmptyBandOrAThreeDecimalDiscountIsRefused() {
        UUID view = pnhHkg.getId();
        List<VolumeBreakRequest> withNull = new ArrayList<>();
        withNull.add(band(1, null, "0"));
        withNull.add(null);
        assertRefused(
                () -> service.putVolumeBreaks(lan, null, withNull, view),
                "INVALID_VOLUME_BREAKS",
                "Each band needs the horse count it starts at.");
        assertRefused(
                () -> service.putVolumeBreaks(lan, null, List.of(band(1, null, "2.505")), view),
                "INVALID_VOLUME_BREAKS",
                "A discount has at most 2 decimals.");
        verify(breaks, never()).deleteGlobalBands(any());
    }

    /**
     * Two drafts created at once: each locks the published version first, so the second waits for the first to
     * commit and then finds its draft, instead of colliding on the one-draft index with a generic conflict.
     */
    @Test
    void createDraftLocksThePublishedVersionBeforeLookingForADraft() {
        DraftResult result = service.createDraft(lan);

        assertThat(result.created()).isFalse();
        assertThat(result.version().id()).isEqualTo(draft.getId());
        org.mockito.InOrder order = org.mockito.Mockito.inOrder(versions);
        order.verify(versions).lockByStatus(CatalogStatus.PUBLISHED);
        order.verify(versions).findByStatus(CatalogStatus.DRAFT);
    }

    @Test
    void theEstimateBandIsAPercentage() {
        assertRefused(
                () -> service.putPolicies(
                        lan, Map.of(RatePolicyKey.ESTIMATE_BAND_PCT, new BigDecimal("101")), pnhHkg.getId()),
                "ESTIMATE_BAND_PCT",
                "Estimate band must be between 0 and 100%.");
    }
}
