package com.equifreight.model.quotation;

import com.equifreight.entity.QuotationCounterOffer;
import com.equifreight.entity.User;
import com.equifreight.entity.enums.CounterOfferStatus;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

/**
 * A club's counter-offer as the club and the logistics manager read it: what was asked on which lines, and how it was
 * answered.
 *
 * @param versionNo the version asked about
 * @param createdBy who sent it (the club's account name)
 * @param answeredWithVersionNo the version that answered it (REVISED), or null
 */
public record CounterOfferResponse(
        CounterOfferStatus status,
        short versionNo,
        Instant createdAt,
        String createdBy,
        String message,
        List<Line> lines,
        String answerMessage,
        String answeredBy,
        Instant answeredAt,
        Short answeredWithVersionNo) {

    /** One line: the amount as quoted, and the club's price and reason. */
    public record Line(
            String lineKey, String description, BigDecimal quotedAmount, BigDecimal askedAmount, String reason) {}

    public static CounterOfferResponse of(QuotationCounterOffer o) {
        return new CounterOfferResponse(
                o.getStatus(),
                o.getQuotation().getVersionNo(),
                o.getCreatedAt(),
                // The club, read from the request (loaded): the signed-in user's club proxy may be detached.
                o.getRequest().getClub().getName(),
                o.getMessage(),
                o.getLines().stream()
                        .map(l -> new Line(
                                l.getLineKey(),
                                l.getDescription(),
                                l.getQuotedAmount(),
                                l.getAskedAmount(),
                                l.getReason()))
                        .toList(),
                o.getAnswerMessage(),
                nameOf(o.getAnsweredBy()),
                o.getAnsweredAt(),
                o.getAnsweredWithQuotation() == null
                        ? null
                        : o.getAnsweredWithQuotation().getVersionNo());
    }

    private static String nameOf(User user) {
        return user == null ? null : user.recordName();
    }
}
