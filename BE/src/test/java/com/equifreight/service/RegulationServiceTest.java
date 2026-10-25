package com.equifreight.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.equifreight.entity.Country;
import com.equifreight.entity.DocumentType;
import com.equifreight.entity.RegulationCatalog;
import com.equifreight.entity.RegulationRule;
import com.equifreight.entity.RegulationVersion;
import com.equifreight.entity.User;
import com.equifreight.entity.enums.CatalogStatus;
import com.equifreight.entity.enums.DocumentScope;
import com.equifreight.entity.enums.RegulationRuleKind;
import com.equifreight.exception.BusinessException;
import com.equifreight.exception.ConflictException;
import com.equifreight.model.clearance.CountryRequest;
import com.equifreight.model.clearance.RegulationCountryResponse;
import com.equifreight.model.clearance.RegulationParametersRequest;
import com.equifreight.model.clearance.RegulationRuleRequest;
import com.equifreight.model.clearance.RegulationRuleUpdateRequest;
import com.equifreight.model.clearance.RegulationVersionResponse;
import com.equifreight.repository.CountryRepository;
import com.equifreight.repository.DocumentTypeRepository;
import com.equifreight.repository.JobRegulationPinRepository;
import com.equifreight.repository.RegulationCatalogRepository;
import com.equifreight.repository.RegulationRuleRepository;
import com.equifreight.repository.RegulationVersionRepository;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.data.domain.Sort;

/** US-F2-12 (#207): adding a country and building its regulation catalog in the app. */
class RegulationServiceTest {

    CountryRepository countries;
    RegulationCatalogRepository catalogs;
    RegulationVersionRepository versions;
    RegulationRuleRepository rules;
    DocumentTypeRepository documentTypes;
    JobRegulationPinRepository pins;
    AuditService audit;
    RegulationService service;

    User lan;
    Country us;
    RegulationCatalog usCatalog;
    RegulationVersion usDraft;
    DocumentType eia;
    List<RegulationRule> draftRules;

    @BeforeEach
    void setUp() {
        countries = mock(CountryRepository.class);
        catalogs = mock(RegulationCatalogRepository.class);
        versions = mock(RegulationVersionRepository.class);
        rules = mock(RegulationRuleRepository.class);
        documentTypes = mock(DocumentTypeRepository.class);
        pins = mock(JobRegulationPinRepository.class);
        audit = mock(AuditService.class);
        service = new RegulationService(countries, catalogs, versions, rules, documentTypes, pins, audit);

        lan = new User();
        lan.setId(UUID.randomUUID());
        us = country("US", "United States");
        usCatalog = new RegulationCatalog();
        usCatalog.setId(UUID.randomUUID());
        usCatalog.setCountry(us);
        usCatalog.setName("United States import");
        usDraft = version(usCatalog, 1, CatalogStatus.DRAFT);
        eia = new DocumentType();
        eia.setId(UUID.randomUUID());
        eia.setCode("EIA_TEST");
        eia.setName("EIA (Coggins) test");
        eia.setScope(DocumentScope.PER_HORSE);
        draftRules = new ArrayList<>();

        when(countries.findById(us.getId())).thenReturn(Optional.of(us));
        when(countries.saveAndFlush(any())).thenAnswer(i -> withId(i.getArgument(0)));
        when(catalogs.saveAndFlush(any())).thenAnswer(i -> withId(i.getArgument(0)));
        when(versions.save(any())).thenAnswer(i -> withId(i.getArgument(0)));
        when(versions.findById(usDraft.getId())).thenReturn(Optional.of(usDraft));
        when(versions.findByCatalogIdAndStatusOrdered(usCatalog.getId(), CatalogStatus.PUBLISHED))
                .thenReturn(List.of());
        when(rules.findByVersionId(usDraft.getId())).thenReturn(draftRules);
        when(rules.saveAndFlush(any())).thenAnswer(i -> {
            RegulationRule r = withId(i.getArgument(0));
            draftRules.add(r);
            return r;
        });
        when(documentTypes.findById(eia.getId())).thenReturn(Optional.of(eia));
    }

    static <T extends com.equifreight.entity.BaseEntity> T withId(T entity) {
        if (entity.getId() == null) {
            entity.setId(UUID.randomUUID());
        }
        return entity;
    }

    static Country country(String code, String name) {
        Country c = new Country();
        c.setId(UUID.randomUUID());
        c.setCode(code);
        c.setName(name);
        return c;
    }

    static RegulationVersion version(RegulationCatalog catalog, int no, CatalogStatus status) {
        RegulationVersion v = new RegulationVersion();
        v.setId(UUID.randomUUID());
        v.setCatalog(catalog);
        v.setVersionNo(no);
        v.setStatus(status);
        v.setLeadTimeDays((short) 21);
        v.setDomesticLeadTimeDays((short) 3);
        v.setQuarantineMinDays((short) 7);
        v.setArrivalBufferDays((short) 2);
        return v;
    }

    RegulationRule eiaRule(RegulationVersion v, int maxDays) {
        RegulationRule r = new RegulationRule();
        r.setId(UUID.randomUUID());
        r.setVersion(v);
        r.setDocumentType(eia);
        r.setRuleKind(RegulationRuleKind.WINDOW_BEFORE_DEPARTURE);
        r.setMaxDays((short) maxDays);
        r.setMandatory(true);
        return r;
    }

    static RegulationParametersRequest parameters(int lead) {
        return new RegulationParametersRequest((short) lead, (short) 3, (short) 7, (short) 2);
    }

    // --- countries -------------------------------------------------------------------------------------------

    @Test
    void addsACountryWithItsCodeInCapitalsAndAudits() {
        RegulationCountryResponse added = service.addCountry(new CountryRequest(" us ", "United States"), lan);

        assertThat(added.code()).isEqualTo("US");
        assertThat(added.name()).isEqualTo("United States");
        assertThat(added.catalog()).isNull();
        verify(audit)
                .recordDecision(
                        eq(lan),
                        eq("COUNTRY_ADDED"),
                        eq("Added United States (US) to the countries we serve."),
                        eq("COUNTRY"),
                        eq(added.id()),
                        eq("US"),
                        isNull(),
                        isNull(),
                        isNull());
    }

    @Test
    void refusesAMalformedCountryCode() {
        for (String code : List.of("USA", "U", "1A", "")) {
            assertThatThrownBy(() -> service.addCountry(new CountryRequest(code, "United States"), lan))
                    .isInstanceOf(BusinessException.class)
                    .hasMessageContaining("two-letter ISO 3166-1 code");
        }
        verify(countries, never()).saveAndFlush(any());
    }

    @Test
    void refusesACountryCodeAlreadyServed() {
        when(countries.findByCode("HK")).thenReturn(Optional.of(country("HK", "Hong Kong")));

        assertThatThrownBy(() -> service.addCountry(new CountryRequest("hk", "Hongkong"), lan))
                .isInstanceOfSatisfying(
                        ConflictException.class, e -> assertThat(e.getCode()).isEqualTo("COUNTRY_EXISTS"))
                .hasMessage("HK is already a country we serve, as Hong Kong.");
        verify(countries, never()).saveAndFlush(any());
        verify(audit, never()).recordDecision(any(), anyString(), any(), any(), any(), any(), any(), any(), any());
    }

    @Test
    void listsEveryCountryWithItsCatalogOrNone() {
        Country hk = country("HK", "Hong Kong");
        RegulationCatalog hkCatalog = new RegulationCatalog();
        hkCatalog.setId(UUID.randomUUID());
        hkCatalog.setCountry(hk);
        hkCatalog.setName("Hong Kong import");
        RegulationVersion hk9 = version(hkCatalog, 9, CatalogStatus.PUBLISHED);
        when(countries.findAll(any(Sort.class))).thenReturn(List.of(hk, us));
        when(catalogs.findAll()).thenReturn(List.of(hkCatalog));
        when(versions.findAllByOrderByVersionNoDesc()).thenReturn(List.of(hk9));
        when(pins.countPinsByVersion()).thenReturn(List.of());

        List<RegulationCountryResponse> list = service.listCountries();

        assertThat(list).extracting(RegulationCountryResponse::code).containsExactly("HK", "US");
        assertThat(list.get(0).catalog().activeVersion().versionNo()).isEqualTo(9);
        assertThat(list.get(1).catalog()).isNull();
    }

    // --- catalog ---------------------------------------------------------------------------------------------

    @Test
    void createsTheCatalogWithAFirstDraftVersion() {
        List<RegulationVersion> created = new ArrayList<>();
        doAnswer(i -> {
                    created.add(withId(i.getArgument(0)));
                    return created.get(0);
                })
                .when(versions)
                .save(any());
        doAnswer(i -> Optional.of(created.get(0))).when(versions).findById(any());

        RegulationVersionResponse draft = service.createCatalog(
                us.getId(), new RegulationParametersRequest((short) 30, (short) 3, (short) 14, (short) 2), lan);

        ArgumentCaptor<RegulationVersion> saved = ArgumentCaptor.forClass(RegulationVersion.class);
        verify(versions).save(saved.capture());
        assertThat(saved.getValue().getCatalog().getName()).isEqualTo("United States import");
        assertThat(draft.versionNo()).isEqualTo(1);
        assertThat(draft.status()).isEqualTo(CatalogStatus.DRAFT);
        assertThat(draft.leadTimeDays()).isEqualTo((short) 30);
        assertThat(draft.quarantineMinDays()).isEqualTo((short) 14);
        verify(audit)
                .recordDecision(
                        eq(lan),
                        eq("CATALOG_CREATED"),
                        eq("Created the United States regulation catalog with draft version 1."),
                        eq("REGULATION_VERSION"),
                        any(),
                        eq("US v1"),
                        isNull(),
                        isNull(),
                        eq("DRAFT"));
    }

    @Test
    void refusesASecondCatalogForOneCountry() {
        when(catalogs.existsByCountryId(us.getId())).thenReturn(true);

        assertThatThrownBy(() -> service.createCatalog(us.getId(), parameters(21), lan))
                .isInstanceOfSatisfying(
                        ConflictException.class, e -> assertThat(e.getCode()).isEqualTo("CATALOG_EXISTS"));
        verify(catalogs, never()).saveAndFlush(any());
    }

    @Test
    void refusesALeadTimeOutOfRange() {
        assertThatThrownBy(() -> service.createCatalog(us.getId(), parameters(0), lan))
                .isInstanceOf(BusinessException.class)
                .hasMessage("The cross-border lead time is 1 to 365 days; 0 isn't in that range.");
        verify(catalogs, never()).saveAndFlush(any());
    }

    // --- rules in a draft ------------------------------------------------------------------------------------

    @Test
    void addsARuleToTheDraftAndAudits() {
        RegulationVersionResponse draft = service.addRule(
                usDraft.getId(),
                new RegulationRuleRequest(
                        eia.getId(), RegulationRuleKind.WINDOW_BEFORE_DEPARTURE, (short) 99, (short) 45, true, null),
                lan);

        assertThat(draft.rules()).hasSize(1);
        assertThat(draft.rules().get(0).parameterDisplay()).isEqualTo("within 45 d");
        // A window before departure has no lower bound; the stray 99 is dropped.
        assertThat(draft.rules().get(0).minDays()).isNull();
        assertThat(draft.rules().get(0).diffStatus()).isEqualTo("NEW");
        assertThat(draft.changesCount()).isEqualTo(1);
        verify(audit)
                .recordDecision(
                        eq(lan),
                        eq("CATALOG_RULE_ADDED"),
                        eq(
                                "Added the EIA (Coggins) test rule (within 45 d) to draft v1 of the United States regulation catalog."),
                        eq("REGULATION_VERSION"),
                        eq(usDraft.getId()),
                        eq("US v1"),
                        isNull(),
                        isNull(),
                        eq("within 45 d"));
    }

    @Test
    void refusesASecondRuleForOneDocumentType() {
        when(rules.existsByVersionIdAndDocumentTypeId(usDraft.getId(), eia.getId()))
                .thenReturn(true);

        assertThatThrownBy(() -> service.addRule(
                        usDraft.getId(),
                        new RegulationRuleRequest(
                                eia.getId(), RegulationRuleKind.PRESENCE_ONLY, null, null, true, null),
                        lan))
                .isInstanceOfSatisfying(
                        ConflictException.class, e -> assertThat(e.getCode()).isEqualTo("RULE_EXISTS"))
                .hasMessage("Draft v1 already has a rule for EIA (Coggins) test. Edit that rule instead.");
        verify(rules, never()).saveAndFlush(any());
    }

    @Test
    void refusesARuleWithoutTheDaysItsShapeNeeds() {
        assertThatThrownBy(() -> service.addRule(
                        usDraft.getId(),
                        new RegulationRuleRequest(
                                eia.getId(), RegulationRuleKind.WINDOW_BEFORE_DEPARTURE, null, null, true, null),
                        lan))
                .isInstanceOf(BusinessException.class)
                .hasMessage("Days before departure is required for this rule shape.");

        assertThatThrownBy(() -> service.addRule(
                        usDraft.getId(),
                        new RegulationRuleRequest(
                                eia.getId(), RegulationRuleKind.BOOSTER_WINDOW, (short) 200, (short) 180, true, null),
                        lan))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("the fewest days can't be more than the most");
        verify(rules, never()).saveAndFlush(any());
    }

    @Test
    void editsAndRemovesARuleInTheDraftWithAnAuditRowEach() {
        RegulationRule rule = eiaRule(usDraft, 60);
        draftRules.add(rule);
        when(rules.findById(rule.getId())).thenReturn(Optional.of(rule));

        service.updateRule(
                rule.getId(),
                new RegulationRuleUpdateRequest(
                        RegulationRuleKind.WINDOW_BEFORE_DEPARTURE, null, (short) 45, true, null),
                lan);
        assertThat(rule.getMaxDays()).isEqualTo((short) 45);
        verify(audit)
                .recordDecision(
                        eq(lan),
                        eq("CATALOG_RULE_CHANGED"),
                        any(),
                        eq("REGULATION_VERSION"),
                        eq(usDraft.getId()),
                        eq("US v1"),
                        isNull(),
                        eq("within 60 d, blocks"),
                        eq("within 45 d, blocks"));

        service.removeRule(rule.getId(), lan);
        verify(rules).delete(rule);
        verify(audit)
                .recordDecision(
                        eq(lan),
                        eq("CATALOG_RULE_REMOVED"),
                        eq(
                                "Removed the EIA (Coggins) test rule from draft v1 of the United States regulation catalog."),
                        eq("REGULATION_VERSION"),
                        eq(usDraft.getId()),
                        eq("US v1"),
                        isNull(),
                        eq("within 45 d"),
                        isNull());
    }

    @Test
    void aPublishedVersionCantChange() {
        RegulationVersion published = version(usCatalog, 1, CatalogStatus.PUBLISHED);
        RegulationRule rule = eiaRule(published, 60);
        when(versions.findById(published.getId())).thenReturn(Optional.of(published));
        when(rules.findById(rule.getId())).thenReturn(Optional.of(rule));
        String refusal =
                "Version 1 of the United States regulation catalog is published, so it can't change. Create a draft version and edit that.";

        assertThatThrownBy(() -> service.updateRule(
                        rule.getId(),
                        new RegulationRuleUpdateRequest(RegulationRuleKind.PRESENCE_ONLY, null, null, true, null),
                        lan))
                .isInstanceOf(ConflictException.class)
                .hasMessage(refusal);
        assertThatThrownBy(() -> service.removeRule(rule.getId(), lan)).hasMessage(refusal);
        assertThatThrownBy(() -> service.addRule(
                        published.getId(),
                        new RegulationRuleRequest(
                                eia.getId(), RegulationRuleKind.PRESENCE_ONLY, null, null, true, null),
                        lan))
                .hasMessage(refusal);
        assertThatThrownBy(() -> service.updateParameters(published.getId(), parameters(30), lan))
                .hasMessage(refusal);

        assertThat(rule.getMaxDays()).isEqualTo((short) 60);
        assertThat(published.getLeadTimeDays()).isEqualTo((short) 21);
        verify(rules, never()).delete(any(RegulationRule.class));
    }

    @Test
    void changesTheDraftParametersAndAudits() {
        service.updateParameters(usDraft.getId(), parameters(30), lan);

        assertThat(usDraft.getLeadTimeDays()).isEqualTo((short) 30);
        verify(audit)
                .recordDecision(
                        eq(lan),
                        eq("CATALOG_DRAFT_CHANGED"),
                        eq("Changed lead time 21 → 30 d in draft v1 of the United States regulation catalog."),
                        eq("REGULATION_VERSION"),
                        eq(usDraft.getId()),
                        eq("US v1"),
                        isNull(),
                        isNull(),
                        isNull());
    }

    // --- publishing ------------------------------------------------------------------------------------------

    @Test
    void aFirstVersionWithoutRulesCantBePublished() {
        assertThatThrownBy(() -> service.publishVersion(usDraft.getId(), lan))
                .isInstanceOfSatisfying(
                        ConflictException.class, e -> assertThat(e.getCode()).isEqualTo("VERSION_HAS_NO_RULES"))
                .hasMessage(
                        "Draft v1 of the United States regulation catalog has no document rules. Add at least one before publishing it.");
        assertThat(usDraft.getStatus()).isEqualTo(CatalogStatus.DRAFT);
    }

    @Test
    void publishesTheNewCountrysFirstVersion() {
        when(rules.countByVersionId(usDraft.getId())).thenReturn(1L);

        RegulationVersionResponse published = service.publishVersion(usDraft.getId(), lan);

        assertThat(published.status()).isEqualTo(CatalogStatus.PUBLISHED);
        assertThat(usDraft.getPublishedBy()).isEqualTo(lan);
        verify(audit)
                .recordDecision(
                        eq(lan),
                        eq("CATALOG_PUBLISHED"),
                        eq("Published version 1 of the United States regulation catalog."),
                        eq("REGULATION_VERSION"),
                        eq(usDraft.getId()),
                        eq("US v1"),
                        isNull(),
                        eq("DRAFT"),
                        eq("PUBLISHED"));
    }

    @Test
    void aDraftCountsNewChangedAndRemovedRulesAgainstThePublishedVersion() {
        RegulationVersion v1 = version(usCatalog, 1, CatalogStatus.PUBLISHED);
        RegulationVersion v2 = version(usCatalog, 2, CatalogStatus.DRAFT);
        v2.setLeadTimeDays((short) 30);
        DocumentType passport = new DocumentType();
        passport.setId(UUID.randomUUID());
        passport.setName("Equine passport");
        RegulationRule removed = new RegulationRule();
        removed.setDocumentType(passport);
        removed.setRuleKind(RegulationRuleKind.PRESENCE_ONLY);
        when(versions.findById(v2.getId())).thenReturn(Optional.of(v2));
        when(versions.findByCatalogIdAndStatusOrdered(usCatalog.getId(), CatalogStatus.PUBLISHED))
                .thenReturn(List.of(v1));
        when(rules.findByVersionId(v1.getId())).thenReturn(List.of(eiaRule(v1, 60), removed));
        when(rules.findByVersionId(v2.getId())).thenReturn(List.of(eiaRule(v2, 45)));

        RegulationVersionResponse draft = service.getVersionDetails(v2.getId());

        assertThat(draft.rules().get(0).diffStatus()).isEqualTo("CHANGED");
        assertThat(draft.rules().get(0).parameterDisplay()).isEqualTo("within 45 d (was within 60 d)");
        // The changed EIA window, the removed passport rule and the longer lead time.
        assertThat(draft.changesCount()).isEqualTo(3);
    }
}
