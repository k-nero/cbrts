package com.equifreight.model.request;

import com.equifreight.entity.Horse;
import com.equifreight.entity.Place;
import com.equifreight.entity.RequestHorse;
import com.equifreight.entity.TransportRequest;
import com.equifreight.model.route.RouteResponse;
import com.equifreight.service.SubmissionCheck;
import java.util.Comparator;
import java.util.List;

public final class RequestMapper {

    private RequestMapper() {}

    public static RequestResponse toResponse(
            TransportRequest r, RouteResponse route, LeadTimeResponse leadTime, List<Blocker> blockers) {
        return RequestResponse.builder()
                .id(r.getId())
                .code(r.getCode())
                .status(r.getStatus())
                .createdAt(r.getCreatedAt())
                .updatedAt(r.getUpdatedAt())
                .submittedAt(r.getSubmittedAt())
                .horses(r.getHorses().stream()
                        .sorted(Comparator.comparing(rh -> rh.getHorse().getName()))
                        .map(RequestMapper::toResponse)
                        .toList())
                .origin(endpoint(r.getOriginPlace(), r.getOriginText()))
                .destination(endpoint(r.getDestinationPlace(), r.getDestinationText()))
                .departureDate(r.getDepartureDate())
                .dateFlexDays(r.getDateFlexDays())
                .arrivalMode(r.getArrivalMode())
                .windowStart(r.getWindowStart())
                .windowEnd(r.getWindowEnd())
                .specialInstructions(r.getSpecialInstructions())
                .mode(r.getMode())
                .trailer(r.getTrailer())
                .airClass(r.getAirClass())
                .insurance(r.getInsurance())
                .vetEscort(r.isVetEscort())
                .route(route)
                .leadTime(leadTime)
                .blockers(blockers)
                .build();
    }

    public static RequestSummaryResponse toSummary(TransportRequest r, long horseCount) {
        return RequestSummaryResponse.builder()
                .id(r.getId())
                .code(r.getCode())
                .status(r.getStatus())
                .origin(endpoint(r.getOriginPlace(), r.getOriginText()))
                .destination(endpoint(r.getDestinationPlace(), r.getDestinationText()))
                .departureDate(r.getDepartureDate())
                .horseCount(horseCount)
                .createdAt(r.getCreatedAt())
                .submittedAt(r.getSubmittedAt())
                .build();
    }

    /** Null when the end isn't set yet. */
    public static EndpointResponse endpoint(Place place, String text) {
        if (place != null) {
            return EndpointResponse.builder()
                    .placeId(place.getId())
                    .name(place.getName())
                    .kind(place.getKind())
                    .city(place.getCity())
                    .countryCode(place.getCountry().getCode())
                    .build();
        }
        return text == null ? null : EndpointResponse.builder().text(text).build();
    }

    private static RequestHorseResponse toResponse(RequestHorse rh) {
        Horse horse = rh.getHorse();
        return RequestHorseResponse.builder()
                .horseId(horse.getId())
                .name(horse.getName())
                .sex(rh.getSex())
                .sizeClassCode(rh.getSizeClassCode())
                .requiredStall(rh.getRequiredStall())
                .declaredValue(rh.getDeclaredValue())
                .withFoal(rh.isWithFoal())
                .archived(horse.getArchivedAt() != null)
                .missing(SubmissionCheck.missingFields(horse))
                .build();
    }
}
