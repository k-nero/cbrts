package com.equifreight.repository;

import com.equifreight.entity.Place;
import com.equifreight.entity.enums.PlaceKind;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

@Repository
public interface PlaceRepository extends JpaRepository<Place, UUID>, JpaSpecificationExecutor<Place> {

    /** The seeder's natural key. */
    Optional<Place> findByName(String name);

    /**
     * Whether a typed city is one we serve, so the customer is asked to pick a place there instead. Called with
     * {@code WELFARE_STOP}: a welfare stop is a stop on the way, never a place the customer can pick.
     */
    boolean existsByCityIgnoreCaseAndKindNot(String city, PlaceKind kind);

    List<Place> findByKind(PlaceKind kind);

    List<Place> findByCountryCode(String countryCode);
}
