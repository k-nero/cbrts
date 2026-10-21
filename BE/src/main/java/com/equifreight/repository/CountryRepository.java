package com.equifreight.repository;

import com.equifreight.entity.Country;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

/**
 * Looked up by the two-letter code (VN, KH, TH, LA, MY, HK); DataSeeder seeds them.
 */
@Repository
public interface CountryRepository extends JpaRepository<Country, UUID> {

    Optional<Country> findByCode(String code);
}
