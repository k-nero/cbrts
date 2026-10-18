package com.equifreight.model.route;

import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

/** A route's new flex days (#115); CorridorService checks the 0 to 7 range with its own sentence. */
@Getter
@Setter
public class DateFlexRequest {

    @NotNull
    private Integer dateFlexDays;
}
