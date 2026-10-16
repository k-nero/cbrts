package com.equifreight.repository;

import com.equifreight.entity.Horse;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface HorseRepository extends JpaRepository<Horse, UUID> {
    List<Horse> findByClubId(UUID clubId);
    Optional<Horse> findByName(String name);
}
