package com.equifreight.repository;

import com.equifreight.entity.BorderCrossing;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface BorderCrossingRepository extends JpaRepository<BorderCrossing, UUID> {
    Optional<BorderCrossing> findByName(String name);
}
