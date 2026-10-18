package com.equifreight.model.route;

import jakarta.validation.constraints.NotNull;
import lombok.Builder;

/** A route's new flex days (#115); CorridorService checks the 0 to 7 range with its own sentence. */
@Builder
public record DateFlexRequest(@NotNull Integer dateFlexDays) {}
