package com.equifreight.repository;

import com.equifreight.entity.QuotationLine;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface QuotationLineRepository extends JpaRepository<QuotationLine, UUID> {

    /** Clears a draft's lines at once before re-pricing writes the new ones. */
    @Modifying
    @Query("delete from QuotationLine l where l.quotation.id = :quotationId")
    void deleteByQuotation(@Param("quotationId") UUID quotationId);
}
