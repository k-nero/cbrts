package com.equifreight.model.request;

import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

import java.util.UUID;

/** A horse of the club on the request; {@code withFoal} only for a mare. */
@Getter
@Setter
public class RequestHorseInput {

    @NotNull
    private UUID horseId;

    private Boolean withFoal;
}
