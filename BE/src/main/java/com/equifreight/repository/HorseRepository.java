package com.equifreight.repository;

import com.equifreight.entity.Horse;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface HorseRepository extends JpaRepository<Horse, UUID>, JpaSpecificationExecutor<Horse> {

    /** Scoped to the club: another club's horse is never found. */
    Optional<Horse> findByIdAndClubId(UUID id, UUID clubId);

    /** An active horse of the club with this name, ignoring case (names are unique among active horses). */
    Optional<Horse> findFirstByClubIdAndNameIgnoreCaseAndArchivedAtIsNull(UUID clubId, String name);

    /** Archived horses count too: the seeder leaves a club that has ever had horses alone. */
    boolean existsByClubId(UUID clubId);

    /** The club's horses among these ids; another club's horse is never found. */
    List<Horse> findByClubIdAndIdIn(UUID clubId, Collection<UUID> ids);

    /** Microchips are unique across every club. */
    Optional<Horse> findByMicrochip(String microchip);
}
