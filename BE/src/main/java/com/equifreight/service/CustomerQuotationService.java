package com.equifreight.service;

import com.equifreight.configuration.BusinessTime;
import com.equifreight.entity.Club;
import com.equifreight.entity.Quotation;
import com.equifreight.entity.TransportRequest;
import com.equifreight.entity.User;
import com.equifreight.entity.enums.FeeBandKind;
import com.equifreight.entity.enums.QuotationStatus;
import com.equifreight.exception.ResourceNotFoundException;
import com.equifreight.model.quotation.CustomerQuotationMapper;
import com.equifreight.model.quotation.CustomerQuotationResponse;
import com.equifreight.repository.QuotationRepository;
import com.equifreight.repository.RateFeeBandRepository;
import com.equifreight.repository.TransportRequestRepository;
import com.equifreight.service.quotation.QuotationSnapshot;
import com.equifreight.service.quotation.Snapshots;
import java.time.Clock;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * The club's view of its quotation: the latest version that was issued (never a draft), as a document. It reads the
 * stored rows, the snapshot and the pinned catalog's cancellation bands, and never runs the engine.
 */
@Service
public class CustomerQuotationService {

    private final TransportRequestRepository requests;
    private final QuotationRepository quotations;
    private final RateFeeBandRepository feeBands;
    private final ClubService clubs;
    private final Snapshots snapshots;
    private final Clock clock;

    public CustomerQuotationService(
            TransportRequestRepository requests,
            QuotationRepository quotations,
            RateFeeBandRepository feeBands,
            ClubService clubs,
            Snapshots snapshots,
            Clock clock) {
        this.requests = requests;
        this.quotations = quotations;
        this.feeBands = feeBands;
        this.clubs = clubs;
        this.snapshots = snapshots;
        this.clock = clock;
    }

    @Transactional(readOnly = true)
    public CustomerQuotationResponse get(User customer, UUID requestId) {
        Club club = clubs.requireClub(customer);
        TransportRequest request = requests.findByIdAndClubId(requestId, club.getId())
                .orElseThrow(() -> ResourceNotFoundException.of("Request", requestId));
        Quotation q = quotations
                .findFirstByRequestIdAndStatusNotOrderByVersionNoDesc(requestId, QuotationStatus.DRAFT)
                .orElseThrow(() -> new ResourceNotFoundException("Quotation for request not issued: " + requestId));
        QuotationSnapshot snapshot = snapshots.of(q, request);
        LocalDate today = LocalDate.now(clock.withZone(BusinessTime.ZONE));
        LocalDate departure = snapshot.request().departureDate();
        long days = departure == null ? 0 : ChronoUnit.DAYS.between(today, departure);
        return CustomerQuotationMapper.toResponse(
                q,
                request,
                snapshot,
                feeBands.findByVersionIdAndKindOrderByMinDays(
                        q.getRateCatalogVersion().getId(), FeeBandKind.CANCELLATION),
                days,
                quotations.findByRequestIdOrderByVersionNoDesc(requestId));
    }
}
