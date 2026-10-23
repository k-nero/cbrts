package com.equifreight.model.incident;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.util.UUID;

/**
 * The logistics manager approves the proposed option (US-F5-03): the message to the customer is required and sent as
 * written, and {@code chargeCustomer} says whether the customer pays the option's extra cost on the final invoice.
 */
public record DecideIncidentRequest(
        @NotNull UUID optionId,
        @Size(max = 1000) String note,
        @NotBlank @Size(max = 1000) String customerMessage,
        boolean chargeCustomer) {}
