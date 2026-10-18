package com.equifreight.repository;

import com.equifreight.entity.RequestRevision;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface RequestRevisionRepository extends JpaRepository<RequestRevision, UUID> {}
