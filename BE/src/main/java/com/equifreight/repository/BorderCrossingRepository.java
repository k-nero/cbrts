package com.equifreight.repository;

import com.equifreight.entity.BorderCrossing;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface BorderCrossingRepository extends JpaRepository<BorderCrossing, UUID> {

    /** The seeder's natural key ("Mộc Bài – Bavet"). */
    Optional<BorderCrossing> findByName(String name);

    boolean existsByNameIgnoreCase(String name);

    /** Every crossing by name, with both countries. */
    @EntityGraph(attributePaths = {"fromCountry", "toCountry"})
    List<BorderCrossing> findAllByOrderByNameAsc();

    /** These crossings with both countries, for a new corridor's border check. */
    @EntityGraph(attributePaths = {"fromCountry", "toCountry"})
    List<BorderCrossing> findByIdIn(Collection<UUID> ids);
}
