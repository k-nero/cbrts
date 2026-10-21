package com.equifreight.model.request;

import jakarta.validation.constraints.NotNull;
import java.util.UUID;
import lombok.Builder;

/** A horse of the club on the request; {@code withFoal} only for a mare. */
@Builder
public record RequestHorseInput(@NotNull UUID horseId, Boolean withFoal) {}
