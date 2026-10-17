package com.equifreight.repository;

import com.equifreight.entity.Corridor;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface CorridorRepository extends JpaRepository<Corridor, UUID> {
    Optional<Corridor> findByCode(String code);
}
