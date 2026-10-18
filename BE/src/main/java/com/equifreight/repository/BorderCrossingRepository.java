package com.equifreight.repository;

import com.equifreight.entity.BorderCrossing;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface BorderCrossingRepository extends JpaRepository<BorderCrossing, UUID> {
    Optional<BorderCrossing> findByName(String name);
}
