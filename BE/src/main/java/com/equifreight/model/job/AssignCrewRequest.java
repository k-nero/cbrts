package com.equifreight.model.job;

import com.equifreight.entity.enums.CrewRole;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Getter
@Setter
public class AssignCrewRequest {

    private List<CrewItem> crew = new ArrayList<>();

    @Getter
    @Setter
    public static class CrewItem {
        @NotNull
        private UUID userId;

        @NotNull
        private CrewRole crewRole;
    }
}
