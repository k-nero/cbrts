package com.equifreight.service;

import com.equifreight.configuration.BusinessTime;
import com.equifreight.entity.Horse;
import com.equifreight.entity.Place;
import com.equifreight.entity.RequestHorse;
import com.equifreight.entity.TransportRequest;
import com.equifreight.entity.enums.ArrivalMode;
import com.equifreight.entity.enums.HorseSex;
import com.equifreight.entity.enums.TransportMode;
import com.equifreight.model.request.Blocker;
import com.equifreight.model.request.LeadTimeResponse;
import com.equifreight.model.route.RouteResponse;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

/**
 * What stops a draft from being submitted (spec §5.2). A draft may be incomplete; these are checked on every
 * read of a draft and again at submission. Horses are judged by their current profile, not the snapshot.
 */
public final class SubmissionCheck {

    private SubmissionCheck() {}

    public static List<Blocker> blockers(TransportRequest request, RouteResolution resolution, LocalDate today) {
        List<Blocker> blockers = new ArrayList<>();
        horses(request, blockers);
        boolean placeNotChosen = ends(request, resolution, blockers);
        route(request, resolution, placeNotChosen, blockers);
        departure(request, resolution, today, blockers);
        service(request, blockers);
        window(request, blockers);
        return blockers;
    }

    /** The profile fields a horse needs before it can travel, by their HorseResponse names, in this order. */
    public static List<String> missingFields(Horse horse) {
        return List.copyOf(missing(horse).keySet());
    }

    private static Map<String, String> missing(Horse horse) {
        Map<String, String> missing = new LinkedHashMap<>();
        if (horse.getPassportNo() == null || horse.getPassportNo().isBlank()) {
            missing.put("passportNo", "passport number");
        }
        if (horse.getMicrochip() == null || horse.getMicrochip().isBlank()) {
            missing.put("microchip", "microchip");
        }
        if (horse.getDateOfBirth() == null) {
            missing.put("dateOfBirth", "date of birth");
        }
        if (horse.getHeightHh() == null) {
            missing.put("heightHh", "height");
        }
        if (horse.getWeightKg() == null) {
            missing.put("weightKg", "weight");
        }
        return missing;
    }

    private static void horses(TransportRequest request, List<Blocker> blockers) {
        if (request.getHorses().isEmpty()) {
            blockers.add(new Blocker("NO_HORSES", "horses", "Add at least one horse."));
            return;
        }
        List<RequestHorse> sorted = request.getHorses().stream()
                .sorted(Comparator.comparing(rh -> rh.getHorse().getName()))
                .toList();
        for (RequestHorse rh : sorted) {
            Horse horse = rh.getHorse();
            List<String> labels = List.copyOf(missing(horse).values());
            if (!labels.isEmpty()) {
                blockers.add(new Blocker("HORSE_INCOMPLETE", "horses", horse.getName() + "'s profile is missing "
                        + join(labels) + ". Add " + (labels.size() == 1 ? "it" : "them") + " on the horse's profile."));
            }
            if (horse.getArchivedAt() != null) {
                blockers.add(new Blocker("HORSE_ARCHIVED", "horses",
                        horse.getName() + " is archived. Remove the horse from this request to submit it."));
            }
            if (rh.isWithFoal() && horse.getSex() != HorseSex.MARE) {
                blockers.add(new Blocker("FOAL_NOT_A_MARE", "horses", horse.getName() + " is recorded as a "
                        + horse.getSex().name().toLowerCase(Locale.ROOT) + ", so can't travel with a foal at foot. "
                        + "Untick the foal, or correct the horse's sex on the profile."));
            }
        }
    }

    /** Returns whether either end is a typed city we serve, which is asked about instead of the route. */
    private static boolean ends(TransportRequest request, RouteResolution resolution, List<Blocker> blockers) {
        boolean notChosen = false;
        if (!isSet(request.getOriginPlace(), request.getOriginText())) {
            blockers.add(new Blocker("ORIGIN_MISSING", "origin", "Choose where the horses are collected."));
        } else if (request.getOriginText() != null && resolution.originTypedCityServed()) {
            blockers.add(placeNotChosen("origin", request.getOriginText()));
            notChosen = true;
        }
        if (!isSet(request.getDestinationPlace(), request.getDestinationText())) {
            blockers.add(new Blocker("DESTINATION_MISSING", "destination", "Choose where the horses are going."));
        } else if (request.getDestinationText() != null && resolution.destinationTypedCityServed()) {
            blockers.add(placeNotChosen("destination", request.getDestinationText()));
            notChosen = true;
        }
        return notChosen;
    }

    private static Blocker placeNotChosen(String field, String city) {
        return new Blocker("PLACE_NOT_CHOSEN", field,
                "Choose a place in " + city + " from the list; a typed city can't be routed.");
    }

    private static void route(TransportRequest request, RouteResolution resolution, boolean placeNotChosen,
                              List<Blocker> blockers) {
        boolean bothEnds = isSet(request.getOriginPlace(), request.getOriginText())
                && isSet(request.getDestinationPlace(), request.getDestinationText());
        if (!bothEnds || placeNotChosen || resolution.corridor() != null) {
            return;
        }
        String route = cityOf(request.getOriginPlace(), request.getOriginText()) + " → "
                + cityOf(request.getDestinationPlace(), request.getDestinationText());
        TransportMode mode = request.getMode();
        if (resolution.modesRun().isEmpty()) {
            blockers.add(new Blocker("ROUTE_NOT_RUN", "destination", "We don't run " + route + "."));
        } else if (mode != null) {
            TransportMode other = mode == TransportMode.AIR ? TransportMode.ROAD : TransportMode.AIR;
            blockers.add(new Blocker("ROUTE_NOT_RUN", "mode", "We don't run " + route + " by " + label(mode)
                    + ". Choose " + label(other) + "."));
        }
        // No mode yet and more than one mode run: the mode blocker asks for it.
    }

    private static void departure(TransportRequest request, RouteResolution resolution, LocalDate today,
                                  List<Blocker> blockers) {
        LocalDate departure = request.getDepartureDate();
        if (departure == null) {
            blockers.add(new Blocker("DEPARTURE_MISSING", "departureDate", "Choose a departure date."));
            return;
        }
        RouteResponse route = resolution.route();
        if (route == null) {
            return;
        }
        if (resolution.catalogMissingFor() != null) {
            blockers.add(new Blocker("CATALOG_INCOMPLETE", "departureDate", resolution.catalogMissingFor()
                    + " has no published regulation catalog, so the lead time can't be checked. Contact EquiFreight."));
            return;
        }
        if (route.getLeadTimeDays() == null) {
            return;
        }
        LeadTimeResponse leadTime = LeadTimePolicy.assess(route.getLeadTimeDays(), today, departure);
        if (!leadTime.isMet()) {
            blockers.add(new Blocker("LEAD_TIME_TOO_SHORT", "departureDate", LeadTimePolicy.tooSoonMessage(
                    Boolean.TRUE.equals(route.getCrossBorder()), leadTime.getRequiredDays(),
                    leadTime.getEarliestDeparture())));
        }
    }

    private static void service(TransportRequest request, List<Blocker> blockers) {
        if (request.getMode() == null) {
            blockers.add(new Blocker("MODE_MISSING", "mode", "Choose road or air."));
        } else if (request.getMode() == TransportMode.ROAD && request.getTrailer() == null) {
            blockers.add(new Blocker("TRAILER_MISSING", "trailer", "Choose a shared or private trailer."));
        } else if (request.getMode() == TransportMode.AIR && request.getAirClass() == null) {
            blockers.add(new Blocker("AIR_CLASS_MISSING", "airClass", "Choose Economy, Business or First."));
        }
        if (request.getInsurance() == null) {
            blockers.add(new Blocker("INSURANCE_MISSING", "insurance",
                    "Choose your own policy or EquiFreight's insurance."));
        }
    }

    private static void window(TransportRequest request, List<Blocker> blockers) {
        if (request.getArrivalMode() != ArrivalMode.WINDOW || request.getWindowStart() == null
                || request.getDepartureDate() == null) {
            return;
        }
        LocalDate starts = request.getWindowStart().atZone(BusinessTime.ZONE).toLocalDate();
        if (starts.isBefore(request.getDepartureDate())) {
            blockers.add(new Blocker("WINDOW_BEFORE_DEPARTURE", "windowStart", "The arrival window starts on "
                    + BusinessTime.SHORT_DAY.format(starts) + ", before the "
                    + BusinessTime.SHORT_DAY.format(request.getDepartureDate()) + " departure."));
        }
    }

    private static boolean isSet(Place place, String text) {
        return place != null || text != null;
    }

    private static String cityOf(Place place, String text) {
        return place != null ? place.getCity() : text;
    }

    private static String label(TransportMode mode) {
        return mode.name().toLowerCase(Locale.ROOT);
    }

    private static String join(List<String> labels) {
        if (labels.size() == 1) {
            return labels.getFirst();
        }
        return String.join(", ", labels.subList(0, labels.size() - 1)) + " and " + labels.getLast();
    }
}
