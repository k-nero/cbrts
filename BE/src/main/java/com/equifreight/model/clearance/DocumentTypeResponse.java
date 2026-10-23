package com.equifreight.model.clearance;

import com.equifreight.entity.enums.DocumentCategory;
import com.equifreight.entity.enums.DocumentProvider;
import com.equifreight.entity.enums.DocumentScope;
import java.util.UUID;
import lombok.Builder;

@Builder
public record DocumentTypeResponse(
        UUID id,
        String code,
        String name,
        DocumentScope scope,
        DocumentProvider providedBy,
        DocumentCategory category) {}
