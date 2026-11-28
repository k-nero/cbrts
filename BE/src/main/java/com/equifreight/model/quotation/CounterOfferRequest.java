package com.equifreight.model.quotation;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.util.List;

/**
 * The club's counter-offer on the version it reads: the lines it would like cheaper.
 *
 * @param versionNo the version the club read; when given and no longer the latest issued one, the ask is refused
 * @param message an optional note for the whole counter-offer
 * @param lines at least one negotiable line, each with the club's price and reason
 */
public record CounterOfferRequest(
        Integer versionNo,
        @Size(max = 500) String message,
        @NotNull @Valid List<@NotNull CounterOfferLineRequest> lines) {}
