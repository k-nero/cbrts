package com.equifreight.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.equifreight.entity.Horse;
import com.equifreight.entity.TransportJob;
import com.equifreight.entity.Trip;
import com.equifreight.entity.TripHorse;
import com.equifreight.entity.TripJob;
import com.equifreight.entity.enums.JobStage;
import com.equifreight.entity.enums.TripHorseStatus;
import com.equifreight.entity.enums.TripStatus;
import com.equifreight.exception.BusinessException;
import com.equifreight.repository.TripHorseRepository;
import com.equifreight.repository.TripJobRepository;
import com.equifreight.repository.TripRepository;
import com.equifreight.repository.TripVehicleRepository;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

/** US-F3-16: a job planned as a chain of trips (docs/multi-trip-jobs-design.md). */
class TripChainTest {

    private final TripRepository trips = mock(TripRepository.class);
    private final TripVehicleRepository tripVehicles = mock(TripVehicleRepository.class);
    private final TripHorseRepository tripHorses = mock(TripHorseRepository.class);
    private final TripJobRepository parts = mock(TripJobRepository.class);
    private final CodeService codes = mock(CodeService.class);
    private JobTripService service;

    private final TransportJob job = new TransportJob();
    private final Trip road = trip("TRP-2026-041");
    private final Trip air = trip("TRP-2026-042");
    private final Horse shadowfax = horse("Shadowfax");
    private final Horse nightfall = horse("Nightfall");

    private static Trip trip(String code) {
        Trip t = new Trip();
        t.setId(UUID.randomUUID());
        t.setCode(code);
        return t;
    }

    private static Horse horse(String name) {
        Horse h = new Horse();
        h.setId(UUID.randomUUID());
        h.setName(name);
        return h;
    }

    private TripHorse row(Trip trip, Horse horse, TripHorseStatus status) {
        TripHorse th = new TripHorse();
        th.setTrip(trip);
        th.setJob(job);
        th.setHorse(horse);
        th.setStatus(status);
        return th;
    }

    private TripJob part(Trip trip) {
        TripJob p = new TripJob();
        p.setId(UUID.randomUUID());
        p.setTrip(trip);
        p.setJob(job);
        when(parts.findByTrip_IdAndJob_Id(trip.getId(), job.getId())).thenReturn(Optional.of(p));
        return p;
    }

    @BeforeEach
    void setUp() {
        service = new JobTripService(trips, tripVehicles, tripHorses, parts, codes);
        job.setId(UUID.randomUUID());
        job.setCode("CBRT-2026-041");
        job.setStage(JobStage.TRIP);
        when(parts.save(any())).thenAnswer(i -> i.getArgument(0));
        when(parts.saveAndFlush(any())).thenAnswer(i -> i.getArgument(0));
        when(parts.findByNext_IdOrderByCreatedAt(any())).thenReturn(List.of());
    }

    @Test
    @DisplayName("Continuing on the next trip plans the job's horses there and links the parts")
    void planningTheNextTripPlansTheHorsesAndLinksTheParts() {
        TripJob first = part(road);
        TripJob next = part(air);
        when(tripHorses.findByTrip_IdAndJob_IdAndStatusIn(any(), any(), any()))
                .thenReturn(List.of(
                        row(road, shadowfax, TripHorseStatus.ON_TRIP), row(road, nightfall, TripHorseStatus.ON_TRIP)));
        when(tripHorses.findByTrip_IdOrderByCreatedAt(air.getId())).thenReturn(List.of());

        service.planNext(job, road, air);

        ArgumentCaptor<TripHorse> planned = ArgumentCaptor.forClass(TripHorse.class);
        verify(tripHorses, org.mockito.Mockito.times(2)).save(planned.capture());
        assertThat(planned.getAllValues())
                .allMatch(th -> th.getTrip() == air && th.getStatus() == TripHorseStatus.PLANNED)
                .extracting(TripHorse::getHorse)
                .containsExactly(shadowfax, nightfall);
        assertThat(first.getNext()).isSameAs(next);
        assertThat(next.getNext()).isNull();
    }

    @Test
    @DisplayName("A trip put in the middle of the chain hands on where the part before did")
    void aTripInTheMiddleHandsOnWhereThePartBeforeDid() {
        Trip after = trip("TRP-2026-043");
        TripJob first = part(road);
        TripJob last = part(after);
        first.setNext(last);
        TripJob middle = part(air);
        when(tripHorses.findByTrip_IdAndJob_IdAndStatusIn(any(), any(), any()))
                .thenReturn(List.of(row(road, shadowfax, TripHorseStatus.ON_TRIP)));
        when(tripHorses.findByTrip_IdOrderByCreatedAt(air.getId())).thenReturn(List.of());

        service.planNext(job, road, air);

        assertThat(first.getNext()).isSameAs(middle);
        assertThat(middle.getNext()).isSameAs(last);
    }

    @Test
    @DisplayName("Handing on takes the horses off this trip and onto the next one")
    void handingOnMovesTheHorsesToTheNextTrip() {
        TripJob first = part(road);
        first.setNext(part(air));
        TripHorse leaving = row(road, shadowfax, TripHorseStatus.ON_TRIP);
        TripHorse waiting = row(air, shadowfax, TripHorseStatus.PLANNED);
        when(tripHorses.findByTrip_IdAndJob_IdAndStatus(road.getId(), job.getId(), TripHorseStatus.ON_TRIP))
                .thenReturn(List.of(leaving));
        when(tripHorses.findByTrip_IdAndJob_IdAndStatus(air.getId(), job.getId(), TripHorseStatus.PLANNED))
                .thenReturn(List.of(waiting));

        Optional<Trip> next = service.handOn(road, job);

        assertThat(next).contains(air);
        assertThat(leaving.getStatus()).isEqualTo(TripHorseStatus.HANDED_ON);
        assertThat(waiting.getStatus()).isEqualTo(TripHorseStatus.ON_TRIP);
    }

    @Test
    @DisplayName("The last trip of the chain hands nothing on")
    void theLastTripHandsNothingOn() {
        part(air);

        assertThat(service.handOn(air, job)).isEmpty();
        verify(tripHorses, never()).saveAllAndFlush(anyList());
    }

    @Test
    @DisplayName("A job between two trips of its chain is still moving, and isn't delivered")
    void aJobBetweenTripsIsStillMoving() {
        job.setDepartedAt(Instant.parse("2026-10-20T03:00:00Z"));
        TripJob first = part(road);
        first.setStatus(TripStatus.DELIVERED);
        TripJob second = part(air);
        first.setNext(second);
        when(tripHorses.findByJob_IdOrderByCreatedAt(job.getId()))
                .thenReturn(List.of(
                        row(road, shadowfax, TripHorseStatus.HANDED_ON), row(air, shadowfax, TripHorseStatus.ON_TRIP)));
        when(parts.findByJob_IdOrderByCreatedAt(job.getId())).thenReturn(List.of(first, second));

        service.summarize(job);

        assertThat(job.getTripStatus()).isEqualTo(TripStatus.DEPARTED);
        assertThat(job.getStage()).isEqualTo(JobStage.TRIP);
        assertThat(job.getDeliveredAt()).isNull();
    }

    @Test
    @DisplayName("A job is delivered once the last trip of its chain delivers its horses")
    void aJobIsDeliveredOnTheLastTrip() {
        TripJob first = part(road);
        TripJob second = part(air);
        first.setNext(second);
        second.setDeliveredAt(Instant.parse("2026-10-25T09:00:00Z"));
        when(tripHorses.findByJob_IdOrderByCreatedAt(job.getId()))
                .thenReturn(List.of(
                        row(road, shadowfax, TripHorseStatus.HANDED_ON),
                        row(air, shadowfax, TripHorseStatus.DELIVERED)));
        when(parts.findByJob_IdOrderByCreatedAt(job.getId())).thenReturn(List.of(first, second));

        service.summarize(job);

        assertThat(job.getTripStatus()).isEqualTo(TripStatus.DELIVERED);
        assertThat(job.getStage()).isEqualTo(JobStage.HANDOVER);
        assertThat(job.getDeliveredAt()).isEqualTo(Instant.parse("2026-10-25T09:00:00Z"));
    }

    @Test
    @DisplayName("The job's parts are listed in the order of its chain, whatever order they were made in")
    void partsFollowTheChain() {
        Trip last = trip("TRP-2026-043");
        TripJob first = part(road);
        TripJob end = part(last);
        TripJob middle = part(air);
        first.setNext(middle);
        middle.setNext(end);
        // The middle trip was put in last.
        when(parts.findByJob_IdOrderByCreatedAt(job.getId())).thenReturn(new ArrayList<>(List.of(first, end, middle)));

        assertThat(service.partsOf(job)).containsExactly(first, middle, end);
    }

    @Test
    @DisplayName("Horses an incident moves off a trip of the journey still go on to its next trip")
    void horsesMovedByAnIncidentStayOnTheJourney() {
        Trip rescue = trip("TRP-2026-050");
        TripJob first = part(road);
        TripJob next = part(air);
        first.setNext(next);
        TripJob own = part(rescue);
        when(tripHorses.findByTrip_IdAndJob_IdAndStatus(road.getId(), job.getId(), TripHorseStatus.ON_TRIP))
                .thenReturn(List.of(row(road, shadowfax, TripHorseStatus.ON_TRIP)));

        service.moveHorses(job, List.of(shadowfax.getId()), road, rescue);

        assertThat(own.getNext()).isSameAs(next);
        assertThat(first.getNext()).isSameAs(next);
    }

    @Test
    @DisplayName("A later trip is taken out of the chain only while the job's horses are just planned on it")
    void aTripIsTakenOutOnlyBeforeHandOn() {
        TripJob first = part(road);
        TripJob second = part(air);
        first.setNext(second);
        when(parts.findByNext_IdOrderByCreatedAt(second.getId())).thenReturn(List.of(first));
        when(tripHorses.findByTrip_IdOrderByCreatedAt(air.getId()))
                .thenReturn(List.of(row(air, shadowfax, TripHorseStatus.ON_TRIP)));

        assertThrows(BusinessException.class, () -> service.unplan(job, air));
    }

    @Test
    @DisplayName("Taking a later trip out removes the job's planned horses and part there, and joins the chain")
    void takingATripOutJoinsTheChain() {
        Trip last = trip("TRP-2026-043");
        TripJob first = part(road);
        TripJob second = part(air);
        TripJob third = part(last);
        first.setNext(second);
        second.setNext(third);
        when(parts.findByNext_IdOrderByCreatedAt(second.getId())).thenReturn(List.of(first));
        List<TripHorse> planned = List.of(row(air, shadowfax, TripHorseStatus.PLANNED));
        when(tripHorses.findByTrip_IdOrderByCreatedAt(air.getId())).thenReturn(planned);

        TripJob before = service.unplan(job, air);

        assertThat(before).isSameAs(first);
        assertThat(first.getNext()).isSameAs(third);
        verify(tripHorses).deleteAll(planned);
        verify(parts).delete(second);
    }
}
