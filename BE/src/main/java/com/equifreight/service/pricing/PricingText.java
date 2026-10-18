package com.equifreight.service.pricing;

import com.equifreight.entity.enums.HorseSex;
import com.equifreight.entity.enums.ServiceClass;
import com.equifreight.entity.enums.TrailerType;
import com.equifreight.entity.enums.TransportMode;
import java.math.BigDecimal;
import java.text.DecimalFormat;
import java.text.DecimalFormatSymbols;
import java.util.Locale;
import java.util.Map;

/** The words and figures the quotation texts are made of, in one place so the builder and the catalog agree. */
public final class PricingText {

    private static final Map<String, String> GROUPS = Map.of(
            "A", "Ground transport · origin",
            "B", "Pre-export",
            "D", "Escort",
            "E", "Documentation",
            "F", "Post-arrival",
            "G", "Ground transport · destination",
            "H", "Surcharges");

    private PricingText() {}

    /** "$16,800.00". */
    public static String money(BigDecimal amount) {
        DecimalFormat format = new DecimalFormat("#,##0.00", DecimalFormatSymbols.getInstance(Locale.US));
        return "$" + format.format(amount);
    }

    /** "18%", "1.5%". */
    public static String pct(BigDecimal value) {
        return value.stripTrailingZeros().toPlainString() + "%";
    }

    /** "economy", "business", "first". */
    public static String classWord(ServiceClass serviceClass) {
        return serviceClass.name().toLowerCase(Locale.ROOT);
    }

    /** "shared load", "private trailer". */
    public static String trailerWord(TrailerType trailer) {
        return trailer == TrailerType.SHARED ? "shared load" : "private trailer";
    }

    public static String groupName(String group, TransportMode mode) {
        if ("C".equals(group)) {
            return mode == TransportMode.AIR ? "Air freight" : "Road freight";
        }
        return GROUPS.get(group);
    }

    /** "stallion", "mare", "gelding", "colt", "filly". */
    public static String sexWord(HorseSex sex) {
        return sex.name().toLowerCase(Locale.ROOT);
    }

    /** "1 horse", "2 horses". */
    public static String horses(int count) {
        return count + (count == 1 ? " horse" : " horses");
    }
}
