package com.equifreight.repository;

import com.equifreight.entity.TripRecordDocument;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface TripRecordDocumentRepository extends JpaRepository<TripRecordDocument, UUID> {}
