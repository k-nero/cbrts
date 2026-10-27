package com.equifreight.repository;

import com.equifreight.entity.Corridor;
import com.equifreight.entity.enums.TransportMode;
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

    boolean existsByCodeIgnoreCase(String code);

    /** Whether the route already runs this way by this mode: a second corridor for it would be a duplicate. */
    boolean existsByModeAndOriginCityIgnoreCaseAndDestinationCityIgnoreCase(
            TransportMode mode, String originCity, String destinationCity);

    /** The corridors between two cities, in either direction, ignoring case. */
    @Query("select c from Corridor c where (lower(c.originCity) = lower(:a) and lower(c.destinationCity) = lower(:b))"
            + " or (lower(c.originCity) = lower(:b) and lower(c.destinationCity) = lower(:a)) order by c.code")
    List<Corridor> findBetweenCities(@Param("a") String a, @Param("b") String b);

    /** The local road run within {@code city}, between its stables and its cargo terminal, if the catalog has one. */
    default Optional<Corridor> findLocalRun(String city) {
        if (city == null) return Optional.empty();
        return findBetweenCities(city, city).stream().filter(Corridor::isLocal).findFirst();
    }

    /** The corridors that start or end in a city: the routes we run from there. */
    @Query(
            "select c from Corridor c where lower(c.originCity) = lower(:city) or lower(c.destinationCity) = lower(:city)"
                    + " order by c.code")
    List<Corridor> findTouchingCity(@Param("city") String city);

    /** Every corridor, by code: the report's corridor filter. */
    List<Corridor> findAllByOrderByCodeAsc();

    /**
     * Every road corridor with its crossings and countries (US-F7-03): the network an empty drive between two cities
     * can use, worked out in memory.
     */
    @Query("SELECT DISTINCT c FROM Corridor c LEFT JOIN FETCH c.crossings cc LEFT JOIN FETCH cc.borderCrossing b "
            + "LEFT JOIN FETCH b.toCountry LEFT JOIN FETCH c.originCountry LEFT JOIN FETCH c.destinationCountry "
            + "WHERE c.mode = com.equifreight.entity.enums.TransportMode.ROAD")
    List<Corridor> findRoadNetwork();

    /**
     * Every corridor of both modes with its crossings and countries (US-F1-09): the routes by way of a hub between two
     * cities no corridor joins, worked out in memory.
     */
    @Query("SELECT DISTINCT c FROM Corridor c LEFT JOIN FETCH c.crossings cc LEFT JOIN FETCH cc.borderCrossing b "
            + "LEFT JOIN FETCH b.toCountry LEFT JOIN FETCH c.originCountry LEFT JOIN FETCH c.destinationCountry")
    List<Corridor> findNetwork();
}
