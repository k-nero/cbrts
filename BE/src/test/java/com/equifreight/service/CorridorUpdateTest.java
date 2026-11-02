package com.equifreight.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyCollection;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.equifreight.entity.BorderCrossing;
import com.equifreight.entity.Corridor;
import com.equifreight.entity.CorridorCrossing;
import com.equifreight.entity.Country;
import com.equifreight.entity.User;
import com.equifreight.entity.Vehicle;
import com.equifreight.entity.enums.TransportMode;
import com.equifreight.exception.BusinessException;
import com.equifreight.exception.ConflictException;
import com.equifreight.model.route.CorridorResponse;
import com.equifreight.model.route.UpdateCorridorRequest;
import com.equifreight.repository.BorderCrossingRepository;
import com.equifreight.repository.CorridorCrossingRepository;
import com.equifreight.repository.CorridorRepository;
import com.equifreight.repository.PlaceRepository;
import com.equifreight.repository.VehicleRepository;
import java.util.HashSet;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

/** The fleet & route coordinator edits a route we run: its code, distance, days and border crossings. */
class CorridorUpdateTest {

    private static final UUID ID = UUID.fromString("01a1453c-0000-7000-8000-0000000000c2");

    private final CorridorRepository corridors = mock(CorridorRepository.class);
    private final BorderCrossingRepository crossings = mock(BorderCrossingRepository.class);
    private final VehicleRepository vehicles = mock(VehicleRepository.class);
    private final AuditService audit = mock(AuditService.class);
    private final CatalogUsage usage = mock(CatalogUsage.class);
    private final User khoi = new User();
    private final Country vn = country("VN", "Vietnam");
    private final Country kh = country("KH", "Cambodia");
    private final Country la = country("LA", "Laos");
    private final Country th = country("TH", "Thailand");
    private final BorderCrossing mocBai = crossing("Mộc Bài – Bavet", vn, kh);
    private final BorderCrossing poipet = crossing("Poipet – Aranyaprathet", kh, th);
    private final BorderCrossing laoBao = crossing("Lao Bảo – Dansavanh", vn, la);
    private final BorderCrossing friendship = crossing("Friendship Bridge", la, th);
    private CorridorService service;
    private Corridor hcmBkk;

    @BeforeEach
    void setUp() {
        service = new CorridorService(
                corridors,
                mock(CorridorCrossingRepository.class),
                mock(PlaceRepository.class),
                crossings,
                audit,
                vehicles,
                usage);
        hcmBkk = new Corridor();
        hcmBkk.setId(ID);
        hcmBkk.setCode("RD HCM → BKK");
        hcmBkk.setMode(TransportMode.ROAD);
        hcmBkk.setOriginCity("Ho Chi Minh City");
        hcmBkk.setDestinationCity("Bangkok");
        hcmBkk.setOriginCountry(vn);
        hcmBkk.setDestinationCountry(th);
        hcmBkk.setDistanceKm(890);
        hcmBkk.setDrivingDays((short) 2);
        link(hcmBkk, List.of(mocBai, poipet));
        when(corridors.findById(ID)).thenReturn(Optional.of(hcmBkk));
        when(corridors.saveAndFlush(any(Corridor.class))).thenAnswer(inv -> inv.getArgument(0));
        when(crossings.findByIdIn(anyCollection())).thenReturn(List.of(mocBai, poipet, laoBao, friendship));
    }

    private static Country country(String code, String name) {
        Country c = new Country();
        c.setId(UUID.randomUUID());
        c.setCode(code);
        c.setName(name);
        return c;
    }

    private static BorderCrossing crossing(String name, Country from, Country to) {
        BorderCrossing b = new BorderCrossing();
        b.setId(UUID.randomUUID());
        b.setName(name);
        b.setFromCountry(from);
        b.setToCountry(to);
        return b;
    }

    private static void link(Corridor corridor, List<BorderCrossing> route) {
        for (int i = 0; i < route.size(); i++) {
            CorridorCrossing cc = new CorridorCrossing();
            cc.setCorridor(corridor);
            cc.setSeq((short) (i + 1));
            cc.setBorderCrossing(route.get(i));
            corridor.getCrossings().add(cc);
        }
    }

    private static Vehicle vehicle(String code, Country home, Country... permits) {
        Vehicle v = new Vehicle();
        v.setId(UUID.randomUUID());
        v.setCode(code);
        v.setHomeCountry(home);
        v.setPermittedCountries(new HashSet<>(Set.of(permits)));
        return v;
    }

    private UpdateCorridorRequest.UpdateCorridorRequestBuilder same() {
        return UpdateCorridorRequest.builder()
                .code("RD HCM → BKK")
                .distanceKm(890)
                .dateFlexDays(3)
                .drivingDays(2)
                .crossingIds(List.of(mocBai.getId(), poipet.getId()));
    }

    @Test
    @DisplayName("the code, distance and days change, and the edit is audited")
    void editsTheFields() {
        CorridorResponse saved = service.update(
                khoi,
                ID,
                same().code("RD SGN → BKK")
                        .distanceKm(910)
                        .dateFlexDays(2)
                        .drivingDays(3)
                        .build());

        assertThat(saved.code()).isEqualTo("RD SGN → BKK");
        assertThat(saved.distanceKm()).isEqualTo(910);
        assertThat(saved.dateFlexDays()).isEqualTo(2);
        assertThat(saved.drivingDays()).isEqualTo(3);
        assertThat(saved.crossings()).containsExactly("Mộc Bài – Bavet", "Poipet – Aranyaprathet");
        verify(audit)
                .recordDecision(
                        eq(khoi),
                        eq("CORRIDOR_UPDATED"),
                        eq("Edited route RD HCM → BKK: RD HCM → BKK, 890 km, ±3 days, 2 days, via Mộc Bài – Bavet,"
                                + " Poipet – Aranyaprathet → RD SGN → BKK, 910 km, ±2 days, 3 days, via Mộc Bài –"
                                + " Bavet, Poipet – Aranyaprathet."),
                        eq("CORRIDOR"),
                        eq(ID),
                        eq("RD SGN → BKK"),
                        any(),
                        any(),
                        any());
    }

    @Test
    @DisplayName("saving it unchanged writes nothing to the audit log")
    void noChangeNoAudit() {
        service.update(khoi, ID, same().build());

        verify(audit, never())
                .recordDecision(any(), anyString(), anyString(), anyString(), any(), any(), any(), any(), any());
    }

    @Test
    @DisplayName("another route's code is refused")
    void refusesATakenCode() {
        when(corridors.existsByCodeIgnoreCase("RD HCM → PNH")).thenReturn(true);

        assertThatThrownBy(() ->
                        service.update(khoi, ID, same().code("RD HCM → PNH").build()))
                .isInstanceOf(ConflictException.class)
                .hasMessageContaining("RD HCM → PNH is already used");
    }

    @Test
    @DisplayName("new crossings must still lead from the origin's country to the destination's")
    void refusesABrokenChain() {
        assertThatThrownBy(() -> service.update(
                        khoi, ID, same().crossingIds(List.of(mocBai.getId())).build()))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("the destination is in Thailand");
    }

    @Test
    @DisplayName("the route is re-routed through Laos when every vehicle on it may enter Laos")
    void reroutes() {
        when(vehicles.findRunning(ID)).thenReturn(List.of(vehicle("TX-447", vn, kh, la, th)));

        CorridorResponse saved = service.update(
                khoi,
                ID,
                same().crossingIds(List.of(laoBao.getId(), friendship.getId())).build());

        assertThat(saved.crossings()).containsExactly("Lao Bảo – Dansavanh", "Friendship Bridge");
        assertThat(hcmBkk.getCrossings()).extracting(CorridorCrossing::getSeq).containsExactly((short) 1, (short) 2);
    }

    @Test
    @DisplayName("a re-route a vehicle on the route has no permit for is refused, naming the vehicle")
    void refusesARerouteAVehicleCantRun() {
        when(vehicles.findRunning(ID)).thenReturn(List.of(vehicle("TX-447", vn, kh, th)));

        assertThatThrownBy(() -> service.update(
                        khoi,
                        ID,
                        same().crossingIds(List.of(laoBao.getId(), friendship.getId()))
                                .build()))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("TX-447 has no permit for Laos");
    }

    @Test
    @DisplayName("a route nothing uses is deleted and the deletion audited")
    void deletesAnUnusedRoute() {
        when(usage.corridorInUse(hcmBkk)).thenReturn(Optional.empty());

        service.delete(khoi, ID);

        verify(corridors).delete(hcmBkk);
        verify(audit)
                .recordDecision(
                        eq(khoi),
                        eq("CORRIDOR_DELETED"),
                        eq("Deleted route RD HCM → BKK: Ho Chi Minh City → Bangkok by road."),
                        eq("CORRIDOR"),
                        eq(ID),
                        eq("RD HCM → BKK"),
                        any(),
                        any(),
                        any());
    }

    @Test
    @DisplayName("a route in use is kept, and the refusal says what uses it")
    void refusesDeletingARouteInUse() {
        when(usage.corridorInUse(hcmBkk)).thenReturn(Optional.of("Trips run on RD HCM → BKK, so it stays on record."));

        assertThatThrownBy(() -> service.delete(khoi, ID))
                .isInstanceOf(ConflictException.class)
                .hasMessage("Trips run on RD HCM → BKK, so it stays on record.");
        verify(corridors, never()).delete(any(Corridor.class));
    }
}
