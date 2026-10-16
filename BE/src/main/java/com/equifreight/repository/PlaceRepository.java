package com.equifreight.repository;

import com.equifreight.entity.Place;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface PlaceRepository extends JpaRepository<Place, UUID>, JpaSpecificationExecutor<Place> {

    /** The seeder's natural key. */
    Optional<Place> findByName(String name);

    /** Whether a typed city is one we serve, so the customer is asked to pick a place there instead. */
    boolean existsByCityIgnoreCase(String city);
}
