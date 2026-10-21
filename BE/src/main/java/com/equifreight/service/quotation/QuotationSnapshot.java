package com.equifreight.service.quotation;

import com.equifreight.entity.enums.ArrivalMode;
import com.equifreight.entity.enums.HorseSex;
import com.equifreight.entity.enums.InsuranceOption;
import com.equifreight.entity.enums.ServiceClass;
import com.equifreight.entity.enums.TrailerType;
import com.equifreight.entity.enums.TransportMode;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

/**
 * What an issued quotation froze besides its lines and money (spec §4.3): the totals rows with their bases, how the
 * air stall was sized, and the request as it was quoted. Stored as {@code quotations.issued_snapshot}.
 *
 * @param fit null on road
 * @param stallNote the sizing in words for the customer, under the air freight group; null on road
 */
public record QuotationSnapshot(List<Row> rows, Fit fit, String stallNote, Facts request) {

    /** A totals row as issued: "Contingency", "5% of $33,353.25", $1,667.66. */
    public record Row(String key, String label, String baseText, BigDecimal amount) {}

    public record Fit(int positions, int widthUsedIn) {}

    public record Facts(
            String fromCity,
            String toCity,
            TransportMode mode,
            TrailerType trailer,
            ServiceClass airClass,
            List<Horse> horses,
            LocalDate departureDate,
            short dateFlexDays,
            ArrivalMode arrivalMode,
            Instant windowStart,
            Instant windowEnd,
            InsuranceOption insurance,
            boolean vetEscort) {}

    /** A horse as quoted; the coat draws its swatch on the quoted pass. */
    public record Horse(UUID id, String name, HorseSex sex, String sizeClass, String coat) {}
}
