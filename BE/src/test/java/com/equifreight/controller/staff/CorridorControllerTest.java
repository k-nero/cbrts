package com.equifreight.controller.staff;

import static org.assertj.core.api.Assertions.assertThat;

import com.equifreight.entity.User;
import com.equifreight.model.route.DateFlexRequest;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.security.access.prepost.PreAuthorize;

/** #115: only the fleet & route coordinator sets a route's flex days; any staff member can read them. */
class CorridorControllerTest {

    @Test
    void onlyTheFleetCoordinatorSetsARoutesFlexDays() throws NoSuchMethodException {
        PreAuthorize rule = CorridorController.class
                .getMethod("setDateFlex", User.class, UUID.class, DateFlexRequest.class)
                .getAnnotation(PreAuthorize.class);

        assertThat(rule).isNotNull();
        assertThat(rule.value()).isEqualTo("hasRole('FLEET_COORDINATOR')");
    }
}
