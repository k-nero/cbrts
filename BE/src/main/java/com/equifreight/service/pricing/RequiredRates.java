package com.equifreight.service.pricing;

import com.equifreight.entity.enums.HorseSex;
import com.equifreight.entity.enums.InsuranceOption;
import com.equifreight.entity.enums.RateBasis;
import com.equifreight.entity.enums.RatePolicyKey;
import com.equifreight.entity.enums.ServiceClass;
import com.equifreight.entity.enums.TrailerType;
import com.equifreight.entity.enums.TransportMode;
import java.util.ArrayList;
import java.util.EnumSet;
import java.util.List;
import java.util.Set;

/**
 * What the catalog must hold to price a request, or to price anything on a corridor (spec §4.5). The builder and the
 * Rates page both ask here, so they name the same gaps.
 */
public final class RequiredRates {

    /** The pre-export isolation rates a corridor must hold for the common sexes. */
    private static final List<HorseSex> CORRIDOR_SEXES = List.of(HorseSex.STALLION, HorseSex.MARE, HorseSex.GELDING);

    private RequiredRates() {}

    public static List<MissingRate> forRequest(PricingInput in, RateSet rates) {
        List<MissingRate> missing = new ArrayList<>();
        String route = in.fromCity() + " → " + in.toCity();
        if (in.mode() == TransportMode.AIR) {
            if (classRow(rates, in.airClass()) == null) {
                missing.add(stall(rates, in.corridorCode(), route, in.airClass()));
            }
            for (PricingHorse horse : in.horses()) {
                if (horse.widthIn() == null) {
                    missing.add(new MissingRate(
                            null,
                            PricingText.fitDescription("Size class of " + horse.name()),
                            "Size class " + horse.sizeClassCode() + " is not in the size class table, so "
                                    + horse.name() + "'s stall width is unknown."));
                }
            }
        } else {
            if (!hasRoadLine(rates, in.trailer())) {
                missing.add(road(rates, in.corridorCode(), route, in.trailer()));
            }
            if (in.distanceKm() == null) {
                missing.add(new MissingRate(
                        null, "Corridor distance", in.corridorCode() + " has no distance in the corridor catalog."));
            }
        }
        if (in.crossingCount() > 0 && !has(rates, RateBasis.PER_CROSSING)) {
            missing.add(crossing(rates, in.corridorCode()));
        }
        if (!has(rates, RateBasis.PER_THREE_HORSES)) {
            missing.add(groom(rates, in.corridorCode()));
        }
        Integer days = in.quarantineDays();
        if (days == null) {
            if (has(rates, RateBasis.PER_DAY)) {
                missing.add(new MissingRate(
                        null,
                        "Quarantine days",
                        "No quarantine days for " + in.destinationCountryName() + " in the regulation catalog."));
            }
        } else if (days > 0) {
            Set<HorseSex> present = EnumSet.noneOf(HorseSex.class);
            in.horses().forEach(h -> present.add(rateSex(h.sex())));
            for (HorseSex sex : present) {
                if (!hasIsolation(rates, sex)) {
                    missing.add(isolation(rates, in.corridorCode(), sex));
                }
            }
        }
        if (QuotePricer.windowApplies(in)) {
            requirePolicy(missing, rates, RatePolicyKey.ARRIVAL_WINDOW_PCT, "Arrival window surcharge");
        }
        requirePolicy(missing, rates, RatePolicyKey.CONTINGENCY_PCT, "Contingency");
        requirePolicy(missing, rates, RatePolicyKey.SERVICE_FEE_PCT, "Service fee");
        if (in.mode() == TransportMode.AIR) {
            requirePolicy(missing, rates, RatePolicyKey.FUEL_PCT, "Fuel surcharge");
        }
        if (in.insurance() == InsuranceOption.EQUIFREIGHT) {
            requirePolicy(missing, rates, RatePolicyKey.INSURANCE_PCT, "Transit insurance");
        }
        if (has(rates, RateBasis.FLIGHT_VET)) {
            requirePolicy(missing, rates, RatePolicyKey.FLIGHT_VET_MIN_HORSES, "Flight vet threshold");
            requirePolicy(missing, rates, RatePolicyKey.HIGH_VALUE_THRESHOLD, "High value threshold");
        }
        return missing;
    }

    public static List<MissingRate> forCorridor(
            TransportMode mode, String corridorCode, String fromCity, String toCity, int crossingCount, RateSet rates) {
        List<MissingRate> missing = new ArrayList<>();
        String route = fromCity + " → " + toCity;
        if (mode == TransportMode.AIR) {
            for (ServiceClass serviceClass : ServiceClass.values()) {
                if (classRow(rates, serviceClass) == null) {
                    missing.add(stall(rates, corridorCode, route, serviceClass));
                }
            }
        } else {
            for (TrailerType trailer : TrailerType.values()) {
                if (!hasRoadLine(rates, trailer)) {
                    missing.add(road(rates, corridorCode, route, trailer));
                }
            }
        }
        if (crossingCount > 0 && !has(rates, RateBasis.PER_CROSSING)) {
            missing.add(crossing(rates, corridorCode));
        }
        if (!has(rates, RateBasis.PER_THREE_HORSES)) {
            missing.add(groom(rates, corridorCode));
        }
        for (HorseSex sex : CORRIDOR_SEXES) {
            if (!hasIsolation(rates, sex)) {
                missing.add(isolation(rates, corridorCode, sex));
            }
        }
        requirePolicy(missing, rates, RatePolicyKey.CONTINGENCY_PCT, "Contingency");
        requirePolicy(missing, rates, RatePolicyKey.SERVICE_FEE_PCT, "Service fee");
        requirePolicy(missing, rates, RatePolicyKey.FUEL_PCT, "Fuel surcharge");
        requirePolicy(missing, rates, RatePolicyKey.INSURANCE_PCT, "Transit insurance");
        return missing;
    }

    /** The sex a horse is priced as: a colt at the stallion rate, a filly at the mare rate (as the load plan). */
    static HorseSex rateSex(HorseSex sex) {
        return switch (sex) {
            case COLT -> HorseSex.STALLION;
            case FILLY -> HorseSex.MARE;
            default -> sex;
        };
    }

    static ClassRow classRow(RateSet rates, ServiceClass serviceClass) {
        return rates.classes().stream()
                .filter(c -> c.serviceClass() == serviceClass)
                .findFirst()
                .orElse(null);
    }

    private static boolean has(RateSet rates, RateBasis basis) {
        return rates.lines().stream().anyMatch(l -> l.basis() == basis);
    }

    private static boolean hasRoadLine(RateSet rates, TrailerType trailer) {
        return rates.lines().stream()
                .anyMatch(l -> l.basis() == RateBasis.PER_KM
                        && "C".equals(l.group())
                        && (l.appliesToTrailer() == null || l.appliesToTrailer() == trailer));
    }

    private static boolean hasIsolation(RateSet rates, HorseSex sex) {
        return rates.lines().stream()
                .anyMatch(l -> l.basis() == RateBasis.PER_DAY
                        && "B".equals(l.group())
                        && (l.appliesToSex() == null || l.appliesToSex() == sex));
    }

    private static String catalog(RateSet rates) {
        return "Rate catalog v" + rates.versionNo() + " has no ";
    }

    private static MissingRate stall(RateSet rates, String code, String route, ServiceClass serviceClass) {
        String word = PricingText.classWord(serviceClass);
        return new MissingRate(
                "C",
                PricingText.fitDescription("Air stall position " + route + ", " + word),
                catalog(rates) + word + " stall rate for " + code + ".");
    }

    private static MissingRate road(RateSet rates, String code, String route, TrailerType trailer) {
        String kind = trailer == TrailerType.SHARED ? "shared-load" : "private-trailer";
        return new MissingRate(
                "C",
                PricingText.fitDescription("Road freight " + route + ", " + PricingText.trailerWord(trailer)),
                catalog(rates) + kind + " road rate for " + code + ".");
    }

    private static MissingRate crossing(RateSet rates, String code) {
        return new MissingRate(
                "E", "Customs and border documentation", catalog(rates) + "border crossing fee for " + code + ".");
    }

    private static MissingRate groom(RateSet rates, String code) {
        return new MissingRate("D", "Groom", catalog(rates) + "groom rate for " + code + ".");
    }

    private static MissingRate isolation(RateSet rates, String code, HorseSex sex) {
        String word = PricingText.sexWord(sex);
        return new MissingRate(
                "B",
                "Pre-export isolation · " + word,
                catalog(rates) + "isolation rate for a " + word + " on " + code + ".");
    }

    private static void requirePolicy(List<MissingRate> missing, RateSet rates, RatePolicyKey key, String label) {
        if (rates.policies().get(key) == null) {
            missing.add(new MissingRate(
                    null, label, catalog(rates) + label.toLowerCase(java.util.Locale.ROOT) + " value."));
        }
    }
}
