package com.equifreight.repository;

import com.equifreight.entity.Country;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

/**
 * Keyed by the two-letter code (VN, KH, TH, LA, MY, HK), seeded by V2.
 */
@Repository
public interface CountryRepository extends JpaRepository<Country, String> {}
