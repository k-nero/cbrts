package com.equifreight.model.clearance;

import com.equifreight.entity.enums.DocumentProvider;
import com.equifreight.entity.enums.DocumentScope;
import lombok.*;

import java.util.UUID;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DocumentTypeResponse {
    private UUID id;
    private String code;
    private String name;
    private DocumentScope scope;
    private DocumentProvider providedBy;
}
