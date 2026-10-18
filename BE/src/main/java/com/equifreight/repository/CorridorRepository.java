package com.equifreight.repository;

import com.equifreight.entity.Corridor;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface CorridorRepository extends JpaRepository<Corridor, UUID> {

    /** The seeder's natural key ("RD HCM → BKK"). */
    Optional<Corridor> findByCode(String code);

    /** The corridors between two cities, in either direction, ignoring case. */
    @Query("select c from Corridor c where (lower(c.originCity) = lower(:a) and lower(c.destinationCity) = lower(:b))"
            + " or (lower(c.originCity) = lower(:b) and lower(c.destinationCity) = lower(:a)) order by c.code")
    List<Corridor> findBetweenCities(@Param("a") String a, @Param("b") String b);

    /** The corridors that start or end in a city: the routes we run from there. */
    @Query(
            "select c from Corridor c where lower(c.originCity) = lower(:city) or lower(c.destinationCity) = lower(:city)"
                    + " order by c.code")
    List<Corridor> findTouchingCity(@Param("city") String city);
}
