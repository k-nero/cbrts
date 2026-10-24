package com.equifreight.model.incident;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/** The logistics manager sends a proposal back, saying why (US-F5-03). */
public record ReturnProposalRequest(
        @NotBlank @Size(max = 1000) String reason) {}
