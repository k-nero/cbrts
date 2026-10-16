package com.equifreight.repository;

import com.equifreight.entity.HorseSizeClass;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface HorseSizeClassRepository extends JpaRepository<HorseSizeClass, UUID> {
    Optional<HorseSizeClass> findByCode(String code);
}
