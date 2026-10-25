package com.equifreight.service.pricing;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.equifreight.entity.Corridor;
import com.equifreight.entity.CorridorCrossing;
import com.equifreight.entity.Country;
import com.equifreight.entity.Horse;
import com.equifreight.entity.HorseSizeClass;
import com.equifreight.entity.Place;
import com.equifreight.entity.RegulationCatalog;
import com.equifreight.entity.RegulationVersion;
import com.equifreight.entity.RequestHorse;
import com.equifreight.entity.TransportRequest;
import com.equifreight.entity.enums.CatalogStatus;
import com.equifreight.entity.enums.HorseSex;
import com.equifreight.entity.enums.InsuranceOption;
import com.equifreight.entity.enums.ServiceClass;
import com.equifreight.entity.enums.TransportMode;
import com.equifreight.repository.HorseSizeClassRepository;
import com.equifreight.repository.RegulationCatalogRepository;
import com.equifreight.repository.RegulationVersionRepository;
import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

/** The engine's input, built from a stored request (spec §4.1). */
class PricingInputsTest {

    RegulationCatalogRepository catalogs;
    RegulationVersionRepository versions;
    HorseSizeClassRepository sizeClasses;
    PricingInputs inputs;

    Country cambodia;
    Country hongKong;
    Country vietnam;

    @BeforeEach
    void setUp() {
        catalogs = mock(RegulationCatalogRepository.class);
        versions = mock(RegulationVersionRepository.class);
        sizeClasses = mock(HorseSizeClassRepository.class);
        inputs = new PricingInputs(catalogs, versions, sizeClasses);
        cambodia = country("KH", "Cambodia");
        hongKong = country("HK", "Hong Kong");
        vietnam = country("VN", "Vietnam");
        when(sizeClasses.findAll()).thenReturn(List.of(size("M", 32), size("XL", 96)));
        published(hongKong, 14);
        published(cambodia, 21);
    }

    static Country country(String code, String name) {
        Country c = new Country();
        c.setCode(code);
        c.setName(name);
        return c;
    }

    static HorseSizeClass size(String code, int width) {
        HorseSizeClass s = new HorseSizeClass();
        s.setCode(code);
        s.setWidthIn((short) width);
        return s;
    }

    void published(Country country, int days) {
        RegulationCatalog catalog = new RegulationCatalog();
        catalog.setId(UUID.randomUUID());
        catalog.setCountry(country);
        RegulationVersion version = new RegulationVersion();
        version.setQuarantineMinDays((short) days);
        when(catalogs.findByCountryCode(country.getCode())).thenReturn(Optional.of(catalog));
        when(versions.findByCatalogIdAndStatusOrdered(catalog.getId(), CatalogStatus.PUBLISHED))
                .thenReturn(List.of(version));
    }

    static Place place(String city, Country country) {
        Place p = new Place();
        p.setId(UUID.randomUUID());
        p.setCity(city);
        p.setCountry(country);
        return p;
    }

    static TransportRequest request(Place from, Place to) {
        Corridor corridor = new Corridor();
        corridor.setId(UUID.randomUUID());
        corridor.setCode("AIR PNH → HKG");
        corridor.setMode(TransportMode.AIR);
        corridor.setOriginCity("Phnom Penh");
        corridor.setDestinationCity("Hong Kong");
        corridor.setDistanceKm(1550);
        corridor.getCrossings().add(new CorridorCrossing());
        TransportRequest r = new TransportRequest();
        r.setId(UUID.randomUUID());
        r.setMode(TransportMode.AIR);
        r.setAirClass(ServiceClass.BUSINESS);
        r.setInsurance(InsuranceOption.EQUIFREIGHT);
        r.setVetEscort(true);
        r.setCorridor(corridor);
        r.setOriginPlace(from);
        r.setDestinationPlace(to);
        Horse horse = new Horse();
        horse.setId(UUID.randomUUID());
        horse.setName("Nightfall");
        RequestHorse rh = new RequestHorse();
        rh.setHorse(horse);
        rh.setSex(HorseSex.MARE);
        rh.setSizeClassCode("M");
        rh.setWithFoal(true);
        rh.setDeclaredValue(new BigDecimal("175000"));
        r.getHorses().add(rh);
        return r;
    }

    @Test
    void aReversedCorridorTakesTheRequestsCitiesAndDestinationCountry() {
        TransportRequest reversed = request(place("Hong Kong", hongKong), place("Phnom Penh", cambodia));

        PricingInput in = inputs.inputFor(reversed, ServiceClass.FIRST, true);

        assertThat(in.fromCity()).isEqualTo("Hong Kong");
        assertThat(in.toCity()).isEqualTo("Phnom Penh");
        assertThat(in.destinationCountryName()).isEqualTo("Cambodia");
        assertThat(in.quarantineDays()).isEqualTo(21);
        assertThat(in.corridorCode()).isEqualTo("AIR PNH → HKG");
        assertThat(in.distanceKm()).isEqualTo(1550);
        assertThat(in.crossingCount()).isEqualTo(1);
        assertThat(in.airClass()).isEqualTo(ServiceClass.FIRST);
        assertThat(in.vetEscort()).isTrue();
        assertThat(in.insurance()).isEqualTo(InsuranceOption.EQUIFREIGHT);
    }

    @Test
    void quarantineDaysComeFromTheNewestPublishedVersion() {
        PricingInput in = inputs.inputFor(
                request(place("Phnom Penh", cambodia), place("Hong Kong", hongKong)), ServiceClass.BUSINESS, true);
        assertThat(in.quarantineDays()).isEqualTo(14);
    }

    @Test
    void noPublishedRegulationGivesNullDays() {
        Country laos = country("LA", "Laos");
        when(catalogs.findByCountryCode("LA")).thenReturn(Optional.empty());

        PricingInput in = inputs.inputFor(
                request(place("Phnom Penh", cambodia), place("Vientiane", laos)), ServiceClass.BUSINESS, true);

        assertThat(in.quarantineDays()).isNull();
        assertThat(in.destinationCountryName()).isEqualTo("Laos");
    }

    @Test
    void aDomesticMoveHasNoQuarantine() {
        published(vietnam, 7);

        PricingInput in = inputs.inputFor(
                request(place("Ho Chi Minh City", vietnam), place("Hanoi", vietnam)), ServiceClass.BUSINESS, true);

        assertThat(in.quarantineDays()).isZero();
    }

    @Test
    void widthsComeFromTheSizeClasses() {
        PricingInput in = inputs.inputFor(
                request(place("Phnom Penh", cambodia), place("Hong Kong", hongKong)), ServiceClass.BUSINESS, true);

        PricingHorse horse = in.horses().getFirst();
        assertThat(horse.name()).isEqualTo("Nightfall");
        assertThat(horse.widthIn()).isEqualTo(32);
        assertThat(horse.sizeClassCode()).isEqualTo("M");
        assertThat(horse.withFoal()).isTrue();
        assertThat(horse.sex()).isEqualTo(HorseSex.MARE);
        assertThat(horse.declaredValue()).isEqualByComparingTo("175000");
    }

    // --- deferred minors ---------------------------------------------------------------------------------

    @Test
    void anUnknownSizeClassHasNoWidth() {
        TransportRequest r = request(place("Phnom Penh", cambodia), place("Hong Kong", hongKong));
        r.getHorses().getFirst().setSizeClassCode("Z");

        assertThat(inputs.inputFor(r, ServiceClass.BUSINESS, true)
                        .horses()
                        .getFirst()
                        .widthIn())
                .isNull();
    }

    @Test
    void aCorridorWithoutADistanceHasNoDistance() {
        TransportRequest r = request(place("Phnom Penh", cambodia), place("Hong Kong", hongKong));
        r.getCorridor().setDistanceKm(null);

        assertThat(inputs.inputFor(r, ServiceClass.BUSINESS, true).distanceKm()).isNull();
    }

    @Test
    void aWindowRequestPricesTheWindow() {
        TransportRequest r = request(place("Phnom Penh", cambodia), place("Hong Kong", hongKong));
        assertThat(inputs.inputFor(r, ServiceClass.BUSINESS, true).arrivalWindow())
                .isFalse();

        r.setArrivalMode(com.equifreight.entity.enums.ArrivalMode.WINDOW);
        assertThat(inputs.inputFor(r, ServiceClass.BUSINESS, true).arrivalWindow())
                .isTrue();
    }
}
