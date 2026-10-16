package com.equifreight.repository;

import com.equifreight.entity.RequestRevision;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.UUID;

@Repository
public interface RequestRevisionRepository extends JpaRepository<RequestRevision, UUID> {
}
