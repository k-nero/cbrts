package com.equifreight.model.trip;

import com.equifreight.entity.enums.ChecklistStatus;
import com.equifreight.entity.enums.Validity;
import java.util.UUID;
import lombok.Builder;

@Builder
public record TripBorderDocumentResponse(
        UUID id, String label, ChecklistStatus status, Validity validity, boolean readyToShow) {}
