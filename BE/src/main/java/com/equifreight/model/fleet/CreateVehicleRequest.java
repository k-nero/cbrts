package com.equifreight.model.fleet;

import com.equifreight.entity.enums.VehicleKind;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import java.util.ArrayList;
import java.util.List;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class CreateVehicleRequest {
    @NotBlank
    private String code;

    @NotNull
    private VehicleKind kind;

    @Positive
    private int payloadKg;

    @Valid
    private List<CreateVehicleStallRequest> stalls = new ArrayList<>();
}
