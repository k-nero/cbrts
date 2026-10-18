package com.equifreight.controller.staff;

import static org.assertj.core.api.Assertions.assertThat;

import com.equifreight.entity.User;
import com.equifreight.model.route.DateFlexRequest;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.security.access.prepost.PreAuthorize;

/** #115: the fleet & route coordinator and the logistics manager set a route's flex days; any staff member reads them. */
class CorridorControllerTest {

    @Test
    void theFleetCoordinatorAndTheManagerSetARoutesFlexDays() throws NoSuchMethodException {
        PreAuthorize rule = CorridorController.class
                .getMethod("setDateFlex", User.class, UUID.class, DateFlexRequest.class)
                .getAnnotation(PreAuthorize.class);

        assertThat(rule).isNotNull();
        assertThat(rule.value()).isEqualTo("hasAnyRole('FLEET_COORDINATOR', 'LOGISTICS_MANAGER')");
    }
}
