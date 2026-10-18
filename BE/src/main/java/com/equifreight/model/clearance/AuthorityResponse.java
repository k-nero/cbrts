package com.equifreight.model.clearance;

import com.equifreight.entity.enums.AuthorityKind;
import java.util.UUID;
import lombok.*;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AuthorityResponse {
    private UUID id;
    private String name;
    private String countryCode;
    private AuthorityKind kind;
    private Short slaDays;
}
