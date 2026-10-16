package com.equifreight.repository;

import com.equifreight.entity.BorderCrossing;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface BorderCrossingRepository extends JpaRepository<BorderCrossing, UUID> {
    Optional<BorderCrossing> findByName(String name);
}
