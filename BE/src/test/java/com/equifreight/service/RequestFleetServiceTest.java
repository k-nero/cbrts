package com.equifreight.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.equifreight.configuration.BusinessTime;
import com.equifreight.entity.Corridor;
import com.equifreight.entity.Country;
import com.equifreight.entity.TransportRequest;
import com.equifreight.entity.Vehicle;
import com.equifreight.entity.VehicleBooking;
import com.equifreight.entity.enums.BookingKind;
import com.equifreight.entity.enums.RequestStatus;
import com.equifreight.entity.enums.TransportMode;
import com.equifreight.entity.enums.VehicleStatus;
import com.equifreight.model.review.FleetCheckResponse;
import com.equifreight.repository.VehicleBookingRepository;
import com.equifreight.repository.VehicleRepository;
import java.time.Clock;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

/** US-F7-02: the fleet check at review and the vehicle held from acceptance. */
class RequestFleetServiceTest {

    private static final LocalDate DEPARTS = LocalDate.of(2026, 10, 18);

    private final Country vn = country("VN", "Vietnam");
    private final Country th = country("TH", "Thailand");
    private final Corridor bkkKul = corridor("RD BKK → KUL", TransportMode.ROAD, th);
    private final Corridor sgnHkg = corridor("AIR SGN → HKG", TransportMode.AIR, vn);

    private final VehicleRepository vehicles = mock(VehicleRepository.class);
    private final VehicleBookingRepository bookings = mock(VehicleBookingRepository.class);
    private final VehicleAvailability availability = mock(VehicleAvailability.class);
    private final AuditService audit = mock(AuditService.class);
    private RequestFleetService service;

    private final Vehicle tk102 = vehicle("TK-102", bkkKul);
    private final Vehicle tx447 = vehicle("TX-447", bkkKul);

    @BeforeEach
    void setUp() {
        Clock clock = Clock.fixed(LocalDate.of(2026, 10, 1).atStartOfDay().toInstant(ZoneOffset.UTC), ZoneOffset.UTC);
        service = new RequestFleetService(vehicles, bookings, availability, mock(JobTripService.class), audit, clock);
        when(vehicles.findAllByStatus(VehicleStatus.ACTIVE)).thenReturn(List.of(tx447, tk102));
        when(bookings.findFirstByRequest_Id(any())).thenReturn(Optional.empty());
        when(availability.refusalFor(any(Vehicle.class), any(TransportRequest.class), any()))
                .thenReturn(Optional.of("busy"));
        when(availability.earliestStart(any(), any(), any(), any())).thenReturn(Optional.empty());
        when(bookings.saveAndFlush(any(VehicleBooking.class))).thenAnswer(i -> i.getArgument(0));
        when(availability.heldCorridor(any()))
                .thenAnswer(i -> Optional.ofNullable(
                                i.<TransportRequest>getArgument(0).getCorridor())
                        .filter(Corridor::isRoad));
    }

    @Test
    @DisplayName("a vehicle free on the date: the first by code is named")
    void free() {
        TransportRequest request = request(bkkKul, 2);
        when(availability.refusalFor(tk102, request, DEPARTS)).thenReturn(Optional.empty());

        FleetCheckResponse check = service.check(request);

        assertThat(check.outcome()).isEqualTo("FREE");
        assertThat(check.message()).isEqualTo("TK-102 can start on 18 Oct.");
    }

    @Test
    @DisplayName("none on the date but one within the flexible days")
    void withinFlex() {
        TransportRequest request = request(bkkKul, 2);
        when(availability.earliestStart(eq(tx447), eq(request), any(), any()))
                .thenReturn(Optional.of(LocalDate.of(2026, 10, 20)));

        FleetCheckResponse check = service.check(request);

        assertThat(check.outcome()).isEqualTo("WITHIN_FLEX");
        assertThat(check.message())
                .isEqualTo("No vehicle can start on 18 Oct; TX-447 can start on 20 Oct, within the flexible dates.");
    }

    @Test
    @DisplayName("none within the flexible days: the earliest date is named")
    void none() {
        TransportRequest request = request(bkkKul, 3);
        when(availability.earliestStart(eq(tk102), eq(request), any(), any()))
                .thenReturn(Optional.of(LocalDate.of(2026, 11, 2)));

        FleetCheckResponse check = service.check(request);

        assertThat(check.outcome()).isEqualTo("NONE");
        assertThat(check.earliest()).isEqualTo(LocalDate.of(2026, 11, 2));
        assertThat(check.message())
                .isEqualTo("No vehicle can run RD BKK → KUL by 21 Oct; the earliest is 2 Nov (TK-102).");
    }

    @Test
    @DisplayName("nobody works the corridor")
    void noVehicle() {
        when(vehicles.findAllByStatus(VehicleStatus.ACTIVE)).thenReturn(List.of());

        FleetCheckResponse check = service.check(request(bkkKul, 2));

        assertThat(check.outcome()).isEqualTo("NO_VEHICLE");
        assertThat(check.message()).isEqualTo("No vehicle runs RD BKK → KUL yet. Assign one on the Vehicles page.");
    }

    @Test
    @DisplayName("an air route carries no vehicle")
    void flown() {
        assertThat(service.check(request(sgnHkg, 2)).outcome()).isEqualTo("FLOWN");
    }

    @Test
    @DisplayName("an accepted request without a hold says so")
    void acceptedWithoutHold() {
        TransportRequest request = request(bkkKul, 2);
        request.setStatus(RequestStatus.CUSTOMER_ACCEPTED);

        assertThat(service.check(request).held()).isFalse();
    }

    @Test
    @DisplayName("acceptance holds the first vehicle that can run it, for the corridor's driving days, and audits it")
    void holds() {
        TransportRequest request = request(bkkKul, 2);
        when(availability.refusalFor(tk102, request, DEPARTS)).thenReturn(Optional.empty());
        ArgumentCaptor<VehicleBooking> saved = ArgumentCaptor.forClass(VehicleBooking.class);

        Optional<VehicleBooking> hold = service.hold(request);

        assertThat(hold).isPresent();
        verify(bookings).saveAndFlush(saved.capture());
        assertThat(saved.getValue().getKind()).isEqualTo(BookingKind.RESERVED);
        assertThat(saved.getValue().getVehicle()).isSameAs(tk102);
        assertThat(saved.getValue().getRequest()).isSameAs(request);
        assertThat(saved.getValue().getStartsAt())
                .isEqualTo(DEPARTS.atStartOfDay(BusinessTime.ZONE).toInstant());
        assertThat(saved.getValue().getEndsAt())
                .isEqualTo(DEPARTS.plusDays(3).atStartOfDay(BusinessTime.ZONE).toInstant());
        verify(audit)
                .recordSystem(
                        eq("VEHICLE_HELD"),
                        eq("TK-102 held for " + request.getCode() + " from 18 Oct (RD BKK → KUL)."),
                        anyString(),
                        any(),
                        any(),
                        isNull(),
                        isNull());
    }

    @Test
    @DisplayName("with no vehicle free, nothing is held and the request moves on")
    void noneToHold() {
        TransportRequest request = request(bkkKul, 2);

        assertThat(service.hold(request)).isEmpty();
        verify(bookings, never()).saveAndFlush(any());
        verify(audit).recordSystem(eq("NO_VEHICLE_HELD"), anyString(), anyString(), any(), any(), isNull(), isNull());
    }

    @Test
    @DisplayName("nothing is held for an air route")
    void noHoldWhenFlown() {
        assertThat(service.hold(request(sgnHkg, 2))).isEmpty();
        verify(bookings, never()).saveAndFlush(any());
    }

    @Test
    @DisplayName("at approval, a hold whose vehicle can no longer run it is released and another is held")
    void recheck() {
        TransportRequest request = request(bkkKul, 2);
        VehicleBooking old = new VehicleBooking();
        old.setVehicle(tx447);
        old.setRequest(request);
        old.setKind(BookingKind.RESERVED);
        when(bookings.findFirstByRequest_Id(request.getId()))
                .thenReturn(Optional.of(old))
                .thenReturn(Optional.empty());
        when(bookings.findByRequest_IdIn(any())).thenReturn(List.of(old));
        when(availability.refusalFor(tx447, request, DEPARTS)).thenReturn(Optional.of("TX-447 is in maintenance."));
        when(availability.refusalFor(tk102, request, DEPARTS)).thenReturn(Optional.empty());

        Optional<VehicleBooking> hold = service.recheck(request);

        verify(bookings).deleteAll(List.of(old));
        assertThat(hold).map(VehicleBooking::getVehicle).contains(tk102);
    }

    @Test
    @DisplayName("a rejected request releases its hold, and the release is audited")
    void release() {
        TransportRequest request = request(bkkKul, 2);
        VehicleBooking hold = new VehicleBooking();
        hold.setVehicle(tk102);
        when(bookings.findByRequest_IdIn(any())).thenReturn(List.of(hold));

        service.release(request, "the request was rejected.");

        verify(bookings).deleteAll(List.of(hold));
        verify(audit)
                .recordSystem(
                        eq("VEHICLE_RELEASED"),
                        eq("TK-102 released from " + request.getCode() + ": the request was rejected."),
                        anyString(),
                        any(),
                        any(),
                        isNull(),
                        isNull());
    }

    private static TransportRequest request(Corridor corridor, int flexDays) {
        TransportRequest r = new TransportRequest();
        r.setId(UUID.randomUUID());
        r.setCode("REQ-2026-0" + (int) (Math.random() * 90 + 10));
        r.setCorridor(corridor);
        r.setDepartureDate(DEPARTS);
        r.setDateFlexDays((short) flexDays);
        r.setStatus(RequestStatus.UNDER_REVIEW);
        return r;
    }

    private static Vehicle vehicle(String code, Corridor runs) {
        Vehicle v = new Vehicle();
        v.setId(UUID.randomUUID());
        v.setCode(code);
        v.setStatus(VehicleStatus.ACTIVE);
        v.getOperatingCorridors().add(runs);
        return v;
    }

    private static Corridor corridor(String code, TransportMode mode, Country from) {
        Corridor c = new Corridor();
        c.setId(UUID.randomUUID());
        c.setCode(code);
        c.setMode(mode);
        c.setOriginCountry(from);
        c.setDestinationCountry(from);
        c.setDrivingDays((short) 3);
        return c;
    }

    private static Country country(String code, String name) {
        Country c = new Country();
        c.setId(UUID.randomUUID());
        c.setCode(code);
        c.setName(name);
        return c;
    }
}
