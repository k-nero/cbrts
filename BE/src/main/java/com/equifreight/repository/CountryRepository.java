package com.equifreight.repository;

import com.equifreight.entity.Country;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

/**
 * Looked up by the two-letter code (VN, KH, TH, LA, MY, HK). DataSeeder seeds the launch region; the transport
 * specialist adds any other country from the regulation catalog (US-F2-12).
 */
@Repository
public interface CountryRepository extends JpaRepository<Country, UUID> {

    Optional<Country> findByCode(String code);

    boolean existsByCode(String code);
}
