package com.equifreight.repository;

import com.equifreight.entity.Quotation;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface QuotationRepository extends JpaRepository<Quotation, UUID> {
    Optional<Quotation> findByCode(String code);
}
