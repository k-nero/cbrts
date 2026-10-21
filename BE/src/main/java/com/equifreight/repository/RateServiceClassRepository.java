package com.equifreight.repository;

import com.equifreight.entity.RateServiceClass;
import com.equifreight.entity.enums.ServiceClass;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface RateServiceClassRepository extends JpaRepository<RateServiceClass, UUID> {

    List<RateServiceClass> findByVersionId(UUID versionId);

    Optional<RateServiceClass> findByVersionIdAndCorridorIdAndServiceClass(
            UUID versionId, UUID corridorId, ServiceClass serviceClass);
}
