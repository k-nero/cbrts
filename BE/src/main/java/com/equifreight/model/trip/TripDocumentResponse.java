package com.equifreight.model.trip;

import com.equifreight.entity.enums.ChecklistStatus;
import com.equifreight.entity.enums.Validity;
import java.util.UUID;
import lombok.Builder;

@Builder
public record TripDocumentResponse(
        UUID id, String name, String horseName, String reference, ChecklistStatus status, Validity validity) {}
