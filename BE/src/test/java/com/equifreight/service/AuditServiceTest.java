package com.equifreight.service;

import com.equifreight.configuration.BusinessTime;
import com.equifreight.entity.AuditLog;
import com.equifreight.entity.Club;
import com.equifreight.entity.Role;
import com.equifreight.entity.User;
import com.equifreight.entity.enums.Channel;
import com.equifreight.entity.enums.RoleName;
import com.equifreight.repository.AuditLogRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import tools.jackson.databind.json.JsonMapper;

import java.time.Clock;
import java.time.Instant;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/** One audit line per decision, in the same transaction (BR-F1-08). */
class AuditServiceTest {

    private static final Instant NOW = Instant.parse("2026-09-26T02:14:00Z");
    private static final UUID REQUEST_ID = UUID.fromString("01a1453c-0000-7000-8000-0000000000aa");

    private AuditLogRepository logs;
    private ClubService clubs;
    private AuditService service;

    @BeforeEach
    void setUp() {
        logs = mock(AuditLogRepository.class);
        clubs = mock(ClubService.class);
        when(logs.save(any(AuditLog.class))).thenAnswer(inv -> inv.getArgument(0));
        service = new AuditService(logs, clubs, JsonMapper.builder().build(), Clock.fixed(NOW, BusinessTime.ZONE));
    }

    @Test
    void aCustomerIsLabelledWithTheClubName() {
        User customer = user("Saigon Turf", "Club", RoleName.CUSTOMER);
        Club club = new Club();
        club.setName("Saigon Turf Club");
        when(clubs.findClub(customer)).thenReturn(Optional.of(club));

        service.recordDecision(customer, "REQUEST_SUBMITTED", "Submitted with 1 horse: Nightfall.",
                "TRANSPORT_REQUEST", REQUEST_ID, "REQ-2026-0193", null,
                "{\"status\":\"DRAFT\"}", "{\"status\":\"SUBMITTED\"}");

        AuditLog log = saved();
        assertThat(log.getActor()).isSameAs(customer);
        assertThat(log.getActorLabel()).isEqualTo("Saigon Turf Club");
        assertThat(log.getActorRole()).isEqualTo("CUSTOMER");
        assertThat(log.getChannel()).isEqualTo(Channel.WEB);
        assertThat(log.getAction()).isEqualTo("REQUEST_SUBMITTED");
        assertThat(log.getSummary()).isEqualTo("Submitted with 1 horse: Nightfall.");
        assertThat(log.getEntityType()).isEqualTo("TRANSPORT_REQUEST");
        assertThat(log.getEntityId()).isEqualTo(REQUEST_ID);
        assertThat(log.getEntityCode()).isEqualTo("REQ-2026-0193");
        assertThat(log.getBefore()).isEqualTo("{\"status\":\"DRAFT\"}");
        assertThat(log.getAfter()).isEqualTo("{\"status\":\"SUBMITTED\"}");
        assertThat(log.getOccurredAt()).isEqualTo(NOW);
    }

    @Test
    void staffAreLabelledWithTheirName() {
        User manager = user("Hải Yến", "Vũ", RoleName.LOGISTICS_MANAGER);
        when(clubs.findClub(manager)).thenReturn(Optional.empty());

        service.recordDecision(manager, "REQUEST_REJECTED", "Rejected.", "TRANSPORT_REQUEST", REQUEST_ID,
                "REQ-2026-0193", "No capacity", null, null);

        AuditLog log = saved();
        assertThat(log.getActorLabel()).isEqualTo("Hải Yến Vũ");
        assertThat(log.getActorRole()).isEqualTo("LOGISTICS_MANAGER");
        assertThat(log.getReason()).isEqualTo("No capacity");
    }

    @Test
    void theSystemHasNoActor() {
        service.recordSystem("LEAD_TIME_CHECKED", "Lead time checked: 34 days before departure, 21 required.",
                "TRANSPORT_REQUEST", REQUEST_ID, "REQ-2026-0193", null, null);

        AuditLog log = saved();
        assertThat(log.getActor()).isNull();
        assertThat(log.getActorLabel()).isEqualTo("System");
        assertThat(log.getActorRole()).isEqualTo("SYSTEM");
        assertThat(log.getChannel()).isEqualTo(Channel.SYSTEM);
        assertThat(log.getOccurredAt()).isEqualTo(NOW);
    }

    @Test
    void aBareStatusIsWrappedAsJson() {
        service.recordSystem("X", "Y", "TRANSPORT_REQUEST", REQUEST_ID, "REQ-2026-0193", "DRAFT", "  ");

        AuditLog log = saved();
        assertThat(log.getBefore()).isEqualTo("{\"status\":\"DRAFT\"}");
        assertThat(log.getAfter()).isNull();
    }

    private AuditLog saved() {
        ArgumentCaptor<AuditLog> captor = ArgumentCaptor.forClass(AuditLog.class);
        verify(logs).save(captor.capture());
        return captor.getValue();
    }

    private static User user(String first, String last, String roleName) {
        Role role = new Role();
        role.setName(roleName);
        User user = new User();
        user.setId(UUID.randomUUID());
        user.setFirstName(first);
        user.setLastName(last);
        user.setRoles(Set.of(role));
        return user;
    }
}
