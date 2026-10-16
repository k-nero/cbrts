package com.equifreight.repository;

import com.equifreight.entity.Place;
import com.equifreight.entity.enums.PlaceKind;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface PlaceRepository extends JpaRepository<Place, UUID> {

    Optional<Place> findByName(String name);

    List<Place> findByKind(PlaceKind kind);

    List<Place> findByCountryCode(String countryCode);
}
