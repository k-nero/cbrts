package com.equifreight.repository;

import com.equifreight.entity.RequestHorse;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface RequestHorseRepository extends JpaRepository<RequestHorse, RequestHorse.Key> {
    List<RequestHorse> findByRequest_Id(UUID requestId);

    boolean existsByRequest_IdAndHorse_Id(UUID requestId, UUID horseId);

    Optional<RequestHorse> findByRequest_IdAndHorse_Id(UUID requestId, UUID horseId);
}
