package com.equifreight.model.fleet;

import com.equifreight.entity.enums.VehicleKind;
import com.equifreight.entity.enums.VehicleStatus;
import com.equifreight.model.route.CountryOptionResponse;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import lombok.Builder;

/**
 * A vehicle. {@code available} and {@code unavailableReason} are set only when it is listed for a trip (US-F7-01):
 * whether it may join that trip, and why not.
 */
@Builder(toBuilder = true)
public record VehicleResponse(
        UUID id,
        String code,
        VehicleKind kind,
        int payloadKg,
        VehicleStatus status,
        int stallCount,
        List<VehicleStallResponse> stalls,
        CountryOptionResponse homeCountry,
        List<CountryOptionResponse> permittedCountries,
        List<VehicleCorridorResponse> operatingCorridors,
        /** The date the coordinator expects it back (US-F7-02); null when not set. */
        LocalDate availableOn,
        Boolean available,
        String unavailableReason,
        /** Listed for a trip only: it is held for one of the trip's requests (US-F7-02). */
        Boolean held) {}
