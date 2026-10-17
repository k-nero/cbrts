package com.equifreight.model.job;

import com.equifreight.entity.enums.HorseSex;
import com.equifreight.entity.enums.StallType;
import com.equifreight.entity.enums.Temperament;
import lombok.Builder;
import lombok.Getter;
import lombok.Setter;

import java.util.UUID;

@Getter
@Setter
@Builder
public class JobHorseResponse {
    private UUID id;
    private String name;
    private HorseSex sex;
    private String breed;
    private Short weightKg;
    private String sizeClassCode;
    private StallType requiredStall;
    private Temperament temperament;
    private String handlingNotes;
}
