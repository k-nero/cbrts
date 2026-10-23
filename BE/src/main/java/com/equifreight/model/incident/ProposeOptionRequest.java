package com.equifreight.model.incident;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.util.UUID;

/** The option proposed for the logistics manager's approval, with why (US-F5-02). */
public record ProposeOptionRequest(
        @NotNull UUID optionId, @Size(max = 1000) String note) {}
