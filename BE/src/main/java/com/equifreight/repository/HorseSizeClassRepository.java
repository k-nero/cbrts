package com.equifreight.repository;

import com.equifreight.entity.HorseSizeClass;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface HorseSizeClassRepository extends JpaRepository<HorseSizeClass, UUID> {

    /**
     * Ordered as HorseSizing.sizeClassFor expects.
     */
    List<HorseSizeClass> findAllByOrderByMinHeightHhAsc();

    Optional<HorseSizeClass> findByCode(String code);
}
