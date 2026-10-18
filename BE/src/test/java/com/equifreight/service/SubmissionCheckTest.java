package com.equifreight.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.groups.Tuple.tuple;

import com.equifreight.entity.Corridor;
import com.equifreight.entity.Country;
import com.equifreight.entity.Horse;
import com.equifreight.entity.HorseSizeClass;
import com.equifreight.entity.Place;
import com.equifreight.entity.RequestHorse;
import com.equifreight.entity.TransportRequest;
import com.equifreight.entity.enums.ArrivalMode;
import com.equifreight.entity.enums.HorseSex;
import com.equifreight.entity.enums.InsuranceOption;
import com.equifreight.entity.enums.PlaceKind;
import com.equifreight.entity.enums.ServiceClass;
import com.equifreight.entity.enums.StallType;
import com.equifreight.entity.enums.TrailerType;
import com.equifreight.entity.enums.TransportMode;
import com.equifreight.model.request.Blocker;
import com.equifreight.model.route.RouteResponse;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

/** Spec §5.2: what stops a draft from being submitted, with the exact codes, fields and messages. */
class SubmissionCheckTest {

    private static final LocalDate TODAY = LocalDate.of(2026, 9, 26);

    private final Place phuTho = place("Phú Thọ training centre", "Ho Chi Minh City", "VN", "Vietnam");
    private final Place chaoPhraya = place("Chao Phraya Racing Stables", "Bangkok", "TH", "Thailand");

    private TransportRequest request;
    private RouteResolution resolution;

    @BeforeEach
    void setUp() {
        request = new TransportRequest();
        add(horse("Shadowfax", HorseSex.GELDING));
        add(horse("Nightfall", HorseSex.MARE));
        request.setOriginPlace(phuTho);
        request.setDestinationPlace(chaoPhraya);
        request.setDepartureDate(LocalDate.of(2026, 10, 30));
        request.setMode(TransportMode.ROAD);
        request.setTrailer(TrailerType.SHARED);
        request.setInsurance(InsuranceOption.OWN_POLICY);
        request.setArrivalMode(ArrivalMode.ANY_TIME);
        resolution = resolved(21, true);
    }

    @Test
    void aCompleteRequestHasNoBlockers() {
        assertThat(blockers()).isEmpty();
    }

    @Test
    void noHorsesBlocks() {
        request.getHorses().clear();

        assertThat(blockers())
                .extracting(Blocker::getCode, Blocker::getField, Blocker::getMessage)
                .containsExactly(tuple("NO_HORSES", "horses", "Add at least one horse."));
    }

    @Test
    void anIncompleteHorseNamesItsMissingFields() {
        Horse copperKing = horse("Copper King", HorseSex.STALLION);
        copperKing.setDateOfBirth(null);
        copperKing.setWeightKg(null);
        add(copperKing);

        assertThat(blockers())
                .extracting(Blocker::getCode, Blocker::getMessage)
                .containsExactly(tuple(
                        "HORSE_INCOMPLETE",
                        "Copper King's profile is missing date of birth and weight. Add them on the horse's profile."));
    }

    @Test
    void oneMissingFieldSaysIt() {
        request.getHorses().getFirst().getHorse().setPassportNo(null);

        assertThat(messages())
                .containsExactly("Shadowfax's profile is missing passport number. Add it on the horse's profile.");
    }

    @Test
    void incompleteAndArchivedReadTheCurrentProfile() {
        Horse silverBell = horse("Silver Bell", HorseSex.MARE);
        add(silverBell);
        silverBell.setWeightKg(null);
        silverBell.setArchivedAt(Instant.parse("2026-09-25T00:00:00Z"));

        assertThat(blockers())
                .extracting(Blocker::getCode, Blocker::getMessage)
                .containsExactly(
                        tuple(
                                "HORSE_INCOMPLETE",
                                "Silver Bell's profile is missing weight. Add it on the horse's profile."),
                        tuple(
                                "HORSE_ARCHIVED",
                                "Silver Bell is archived. Remove the horse from this request to submit it."));
    }

    @Test
    void aFoalWithAHorseNoLongerAMareBlocks() {
        RequestHorse shadowfax = request.getHorses().getFirst();
        shadowfax.setSex(HorseSex.MARE);
        shadowfax.setWithFoal(true);

        assertThat(blockers())
                .extracting(Blocker::getCode, Blocker::getField, Blocker::getMessage)
                .containsExactly(
                        tuple(
                                "FOAL_NOT_A_MARE",
                                "horses",
                                "Shadowfax is recorded as a gelding, so can't "
                                        + "travel with a foal at foot. Untick the foal, or correct the horse's sex on the profile."));
    }

    @Test
    void missingEndsAndDateBlock() {
        request.setOriginPlace(null);
        request.setDestinationPlace(null);
        request.setDepartureDate(null);
        resolution = RouteResolution.none();

        assertThat(blockers())
                .extracting(Blocker::getCode, Blocker::getField, Blocker::getMessage)
                .containsExactly(
                        tuple("ORIGIN_MISSING", "origin", "Choose where the horses are collected."),
                        tuple("DESTINATION_MISSING", "destination", "Choose where the horses are going."),
                        tuple("DEPARTURE_MISSING", "departureDate", "Choose a departure date."));
    }

    @Test
    void aTypedCityWeServeAsksForAPlace() {
        request.setDestinationPlace(null);
        request.setDestinationText("Bangkok");
        resolution = new RouteResolution(null, null, Set.of(), null, false, true);

        assertThat(blockers())
                .extracting(Blocker::getCode, Blocker::getField, Blocker::getMessage)
                .containsExactly(tuple(
                        "PLACE_NOT_CHOSEN",
                        "destination",
                        "Choose a place in Bangkok from the list; a typed city can't be routed."));
    }

    @Test
    void aTypedCityWeDontServeIsNotRun() {
        request.setOriginPlace(chaoPhraya);
        request.setDestinationPlace(null);
        request.setDestinationText("Singapore");
        resolution = RouteResolution.none();

        assertThat(blockers())
                .extracting(Blocker::getCode, Blocker::getField, Blocker::getMessage)
                .containsExactly(tuple("ROUTE_NOT_RUN", "destination", "We don't run Bangkok → Singapore."));
    }

    @Test
    void twoPlacesWithNoCorridorAreNotRun() {
        resolution = RouteResolution.none();

        assertThat(messages()).containsExactly("We don't run Ho Chi Minh City → Bangkok.");
    }

    @Test
    void aModeWeDontRunNamesTheOther() {
        request.setMode(TransportMode.AIR);
        request.setTrailer(null);
        request.setAirClass(ServiceClass.BUSINESS);
        resolution = new RouteResolution(null, null, Set.of(TransportMode.ROAD), null, false, false);

        assertThat(blockers())
                .extracting(Blocker::getCode, Blocker::getField, Blocker::getMessage)
                .containsExactly(
                        tuple("ROUTE_NOT_RUN", "mode", "We don't run Ho Chi Minh City → Bangkok by air. Choose road."));
    }

    @Test
    void twoModesWithoutAChoiceOnlyAskForTheMode() {
        request.setMode(null);
        request.setTrailer(null);
        resolution = new RouteResolution(null, null, Set.of(TransportMode.ROAD, TransportMode.AIR), null, false, false);

        assertThat(blockers())
                .extracting(Blocker::getCode, Blocker::getField, Blocker::getMessage)
                .containsExactly(tuple("MODE_MISSING", "mode", "Choose road or air."));
    }

    @Test
    void aMissingCatalogBlocksTheLeadTimeCheck() {
        resolution = new RouteResolution(
                resolution.corridor(), route(null, true), Set.of(TransportMode.ROAD), "Laos", false, false);

        assertThat(blockers())
                .extracting(Blocker::getCode, Blocker::getField, Blocker::getMessage)
                .containsExactly(tuple(
                        "CATALOG_INCOMPLETE",
                        "departureDate",
                        "Laos has no published regulation catalog, so the lead time can't be checked. "
                                + "Contact EquiFreight."));
    }

    @Test
    void aDepartureInsideTheLeadTimeBlocks() {
        request.setDepartureDate(LocalDate.of(2026, 10, 5));

        assertThat(blockers())
                .extracting(Blocker::getCode, Blocker::getField, Blocker::getMessage)
                .containsExactly(tuple(
                        "LEAD_TIME_TOO_SHORT",
                        "departureDate",
                        "Cross-border moves need 21 days for document clearance. "
                                + "The earliest departure is 17 Oct 2026."));
    }

    @Test
    void aDomesticDepartureInsideTheLeadTimeSaysSo() {
        resolution = resolved(3, false);
        request.setDepartureDate(LocalDate.of(2026, 9, 28));

        assertThat(messages())
                .containsExactly(
                        "Moves within one country need 3 days' notice. The earliest departure is 29 Sep 2026.");
    }

    @Test
    void theEarliestDateItselfPasses() {
        request.setDepartureDate(LocalDate.of(2026, 10, 17));

        assertThat(blockers()).isEmpty();
    }

    @Test
    void flexibleDatesMustMeetTheLeadTimeAfterMovingEarlier() {
        request.setDateFlexDays((short) 3);
        request.setDepartureDate(LocalDate.of(2026, 10, 17));

        assertThat(messages())
                .containsExactly("Cross-border moves need 21 days for document clearance. "
                        + "With dates that can move by ±3 days, the earliest departure is 20 Oct 2026.");
    }

    @Test
    void flexibleDatesPassOnTheMovedEarliestDate() {
        request.setDateFlexDays((short) 3);
        request.setDepartureDate(LocalDate.of(2026, 10, 20));

        assertThat(blockers()).isEmpty();
    }

    @Test
    void serviceChoicesBlockUntilMade() {
        request.setTrailer(null);
        request.setInsurance(null);
        assertThat(blockers())
                .extracting(Blocker::getCode, Blocker::getField, Blocker::getMessage)
                .containsExactly(
                        tuple("TRAILER_MISSING", "trailer", "Choose a shared or private trailer."),
                        tuple("INSURANCE_MISSING", "insurance", "Choose your own policy or EquiFreight's insurance."));

        request.setMode(TransportMode.AIR);
        request.setInsurance(InsuranceOption.EQUIFREIGHT);
        resolution = new RouteResolution(
                resolution.corridor(), resolution.route(), Set.of(TransportMode.AIR), null, false, false);
        assertThat(blockers())
                .extracting(Blocker::getCode, Blocker::getField, Blocker::getMessage)
                .containsExactly(tuple("AIR_CLASS_MISSING", "airClass", "Choose Economy, Business or First."));
    }

    @Test
    void aWindowBeforeTheDepartureDayBlocks() {
        window(OffsetDateTime.parse("2026-10-29T08:00:00+07:00").toInstant());

        assertThat(blockers())
                .extracting(Blocker::getCode, Blocker::getField, Blocker::getMessage)
                .containsExactly(tuple(
                        "WINDOW_BEFORE_DEPARTURE",
                        "windowStart",
                        "The arrival window starts on 29 Oct, before the 30 Oct departure."));
    }

    @Test
    void aWindowIsDatedInBusinessTime() {
        window(Instant.parse("2026-10-29T17:30:00Z"));

        assertThat(blockers()).isEmpty();
    }

    @Test
    void missingFieldsListsNamesInOrder() {
        Horse horse = horse("Shadowfax", HorseSex.GELDING);
        horse.setHeightHh(null);
        horse.setMicrochip(null);

        assertThat(SubmissionCheck.missingFields(horse)).containsExactly("microchip", "heightHh");
    }

    private List<Blocker> blockers() {
        return SubmissionCheck.blockers(request, resolution, TODAY);
    }

    private List<String> messages() {
        return blockers().stream().map(Blocker::getMessage).toList();
    }

    private void window(Instant start) {
        request.setArrivalMode(ArrivalMode.WINDOW);
        request.setTrailer(TrailerType.PRIVATE);
        request.setWindowStart(start);
        request.setWindowEnd(start.plusSeconds(4 * 3600));
    }

    private RouteResolution resolved(int leadTimeDays, boolean crossBorder) {
        Corridor corridor = new Corridor();
        corridor.setCode("RD HCM → BKK");
        corridor.setMode(TransportMode.ROAD);
        return new RouteResolution(
                corridor, route(leadTimeDays, crossBorder), Set.of(TransportMode.ROAD), null, false, false);
    }

    private static RouteResponse route(Integer leadTimeDays, boolean crossBorder) {
        return RouteResponse.builder()
                .code("RD HCM → BKK")
                .mode(TransportMode.ROAD)
                .fromCity("Ho Chi Minh City")
                .toCity("Bangkok")
                .crossBorder(crossBorder)
                .leadTimeDays(leadTimeDays)
                .earliestDeparture(leadTimeDays == null ? null : TODAY.plusDays(leadTimeDays))
                .build();
    }

    private void add(Horse horse) {
        RequestHorse rh = new RequestHorse();
        rh.setRequest(request);
        rh.setHorse(horse);
        rh.setSex(horse.getSex());
        rh.setDeclaredValue(horse.getDeclaredValue());
        rh.setSizeClassCode(horse.getSizeClass().getCode());
        rh.setRequiredStall(horse.getRequiredStall());
        request.getHorses().add(rh);
    }

    private static Horse horse(String name, HorseSex sex) {
        HorseSizeClass m = new HorseSizeClass();
        m.setCode("M");
        Horse h = new Horse();
        h.setId(UUID.randomUUID());
        h.setName(name);
        h.setSex(sex);
        h.setPassportNo("VN-PP-2019-0412");
        h.setMicrochip("250259600123456");
        h.setDateOfBirth(LocalDate.of(2019, 5, 10));
        h.setHeightHh(new BigDecimal("16.2"));
        h.setWeightKg((short) 510);
        h.setDeclaredValue(new BigDecimal("85000"));
        h.setSizeClass(m);
        h.setRequiredStall(StallType.STANDARD);
        return h;
    }

    private static Place place(String name, String city, String code, String countryName) {
        Country country = new Country();
        country.setCode(code);
        country.setName(countryName);
        Place p = new Place();
        p.setId(UUID.randomUUID());
        p.setName(name);
        p.setKind(PlaceKind.STABLE);
        p.setCity(city);
        p.setCountry(country);
        return p;
    }
}
