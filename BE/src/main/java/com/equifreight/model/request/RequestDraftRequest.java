package com.equifreight.model.request;

import com.equifreight.entity.enums.ArrivalMode;
import com.equifreight.entity.enums.InsuranceOption;
import com.equifreight.entity.enums.ServiceClass;
import com.equifreight.entity.enums.TrailerType;
import com.equifreight.entity.enums.TransportMode;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;
import lombok.Getter;
import lombok.Setter;

/**
 * A draft request, sent whole on every save (PUT replaces every field). Every field is optional in a draft;
 * what is still missing shows as blockers. The route and dates belong to the request, never to a horse
 * (BR-F1-02).
 */
@Getter
@Setter
public class RequestDraftRequest {

    @Valid
    private List<@NotNull RequestHorseInput> horses;

    /** A catalog place, or {@code originText} for a city that matches none; not both. */
    private UUID originPlaceId;

    @Size(max = 160)
    private String originText;

    private UUID destinationPlaceId;

    @Size(max = 160)
    private String destinationText;

    private LocalDate departureDate;

    /** 0 or 3 ("My dates can move by ±3 days"); null means 0. */
    private Integer dateFlexDays;

    /** Null means ANY_TIME. A window needs road, a private trailer and fixed dates. */
    private ArrivalMode arrivalMode;

    private OffsetDateTime windowStart;

    private OffsetDateTime windowEnd;

    @Size(max = 500)
    private String specialInstructions;

    private TransportMode mode;

    private TrailerType trailer;

    private ServiceClass airClass;

    private InsuranceOption insurance;

    private Boolean vetEscort;
}
