package com.equifreight.repository;

import com.equifreight.entity.CorridorCrossing;
import java.util.Collection;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface CorridorCrossingRepository extends JpaRepository<CorridorCrossing, UUID> {

    /** The crossings of these corridors with their border crossing, in order: one query for a page of corridors. */
    @Query("""
            select cc from CorridorCrossing cc
            join fetch cc.borderCrossing
            where cc.corridor.id in :corridorIds
            order by cc.seq
            """)
    List<CorridorCrossing> findWithCrossingByCorridorIdIn(@Param("corridorIds") Collection<UUID> corridorIds);
}
