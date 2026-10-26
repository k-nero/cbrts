package com.equifreight.repository;

import com.equifreight.entity.Horse;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

@Repository
public interface HorseRepository extends JpaRepository<Horse, UUID>, JpaSpecificationExecutor<Horse> {

    /**
     * Scoped to the club: another club's horse is never found.
     */
    Optional<Horse> findByIdAndClubId(UUID id, UUID clubId);

    /**
     * An active horse of the club with this name, ignoring case (names are unique among active horses).
     */
    Optional<Horse> findFirstByClubIdAndNameIgnoreCaseAndArchivedAtIsNull(UUID clubId, String name);

    /**
     * Archived horses count too: the seeder leaves a club that has ever had horses alone.
     */
    boolean existsByClubId(UUID clubId);

    /**
     * The club's horses among these ids; another club's horse is never found.
     */
    List<Horse> findByClubIdAndIdIn(UUID clubId, Collection<UUID> ids);

    /**
     * Microchips are unique across every club.
     */
    Optional<Horse> findByMicrochip(String microchip);

    /**
     * Flow 3's planning reads a club's horses and looks demo horses up by name.
     */
    List<Horse> findByClubId(UUID clubId);

    /** The club's active horses, by name: the Home's horse list. */
    List<Horse> findByClubIdAndArchivedAtIsNullOrderByName(UUID clubId);

    Optional<Horse> findByName(String name);
}
