package com.equifreight.model.quotation;

import com.equifreight.entity.enums.InsuranceOption;
import com.equifreight.entity.enums.ServiceClass;
import com.equifreight.entity.enums.TrailerType;
import com.equifreight.entity.enums.TransportMode;
import java.time.LocalDate;
import java.util.UUID;
import lombok.Builder;

/**
 * What the builder's header says about the request; requestedClass is the customer's own choice, corridorId the
 * corridor its rates come from (the missing-rates callout links to it in the rate catalog).
 */
@Builder
public record QuotationRequestFacts(
        UUID id,
        String code,
        String club,
        String fromCity,
        String toCity,
        UUID corridorId,
        TransportMode mode,
        TrailerType trailer,
        ServiceClass requestedClass,
        int horseCount,
        LocalDate departureDate,
        short dateFlexDays,
        InsuranceOption insurance,
        boolean vetEscort) {}
