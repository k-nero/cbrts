package com.equifreight.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.equifreight.entity.Corridor;
import com.equifreight.entity.User;
import com.equifreight.entity.enums.TransportMode;
import com.equifreight.exception.BusinessException;
import com.equifreight.exception.ResourceNotFoundException;
import com.equifreight.model.route.CorridorResponse;
import com.equifreight.repository.CorridorRepository;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

/** #115: the fleet & route coordinator or the logistics manager sets how far a route's flexible dates can move. */
class CorridorServiceTest {

    private static final UUID ID = UUID.fromString("01a1453c-0000-7000-8000-0000000000c1");

    private CorridorRepository corridors;
    private AuditService audit;
    private CorridorService service;
    private Corridor hcmPnh;
    private final User khoi = new User();

    @BeforeEach
    void setUp() {
        corridors = mock(CorridorRepository.class);
        audit = mock(AuditService.class);
        service = new CorridorService(corridors, audit);
        hcmPnh = new Corridor();
        hcmPnh.setId(ID);
        hcmPnh.setCode("RD HCM → PNH");
        hcmPnh.setMode(TransportMode.ROAD);
        hcmPnh.setOriginCity("Ho Chi Minh City");
        hcmPnh.setDestinationCity("Phnom Penh");
        when(corridors.findById(ID)).thenReturn(Optional.of(hcmPnh));
        when(corridors.save(any(Corridor.class))).thenAnswer(inv -> inv.getArgument(0));
    }

    @Test
    void aNewRouteMovesByThreeDays() {
        assertThat(new Corridor().getDateFlexDays()).isEqualTo((short) 3);
    }

    @Test
    void settingTheFlexDaysSavesAndAuditsTheChange() {
        CorridorResponse response = service.setDateFlexDays(khoi, ID, 5);

        assertThat(response.getDateFlexDays()).isEqualTo(5);
        assertThat(hcmPnh.getDateFlexDays()).isEqualTo((short) 5);
        verify(audit)
                .recordDecision(
                        khoi,
                        "CORRIDOR_DATE_FLEX_CHANGED",
                        "Flexible dates on RD HCM → PNH: ±3 days → ±5 days.",
                        "CORRIDOR",
                        ID,
                        "RD HCM → PNH",
                        null,
                        "{\"dateFlexDays\":3}",
                        "{\"dateFlexDays\":5}");
    }

    @Test
    void zeroMeansFixedDatesOnly() {
        service.setDateFlexDays(khoi, ID, 0);

        verify(audit)
                .recordDecision(
                        khoi,
                        "CORRIDOR_DATE_FLEX_CHANGED",
                        "Flexible dates on RD HCM → PNH: ±3 days → fixed dates only.",
                        "CORRIDOR",
                        ID,
                        "RD HCM → PNH",
                        null,
                        "{\"dateFlexDays\":3}",
                        "{\"dateFlexDays\":0}");
    }

    @Test
    void theSameValueChangesNothing() {
        service.setDateFlexDays(khoi, ID, 3);

        verify(corridors, never()).save(any());
        verify(audit, never())
                .recordDecision(any(), anyString(), anyString(), anyString(), any(), any(), any(), any(), any());
    }

    @Test
    void moreThanSevenDaysIsRefused() {
        assertThatThrownBy(() -> service.setDateFlexDays(khoi, ID, 8))
                .isInstanceOf(BusinessException.class)
                .hasMessage("A route's dates can move by 0 to 7 days; 8 was given.");
        verify(corridors, never()).save(any());
    }

    @Test
    void aNegativeValueIsRefused() {
        assertThatThrownBy(() -> service.setDateFlexDays(khoi, ID, -1))
                .isInstanceOf(BusinessException.class)
                .hasMessage("A route's dates can move by 0 to 7 days; -1 was given.");
    }

    @Test
    void anUnknownRouteIsNotFound() {
        UUID unknown = UUID.randomUUID();
        when(corridors.findById(unknown)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.setDateFlexDays(khoi, unknown, 5))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    void aCodeLongerThanTheAuditColumnIsNamedInTheSummaryOnly() {
        hcmPnh.setCode("RD HO CHI MINH CITY → PHNOM PENH");

        service.setDateFlexDays(khoi, ID, 4);

        verify(audit)
                .recordDecision(
                        khoi,
                        "CORRIDOR_DATE_FLEX_CHANGED",
                        "Flexible dates on RD HO CHI MINH CITY → PHNOM PENH: ±3 days → ±4 days.",
                        "CORRIDOR",
                        ID,
                        null,
                        null,
                        "{\"dateFlexDays\":3}",
                        "{\"dateFlexDays\":4}");
    }

    @Test
    void oneDayIsSingular() {
        assertThat(CorridorService.words(1)).isEqualTo("±1 day");
    }
}
