package com.equifreight.repository;

import com.equifreight.entity.DocumentType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface DocumentTypeRepository extends JpaRepository<DocumentType, UUID>,
        JpaSpecificationExecutor<DocumentType> {

    /** Tìm loại giấy tờ theo mã (VD: "EQUINE_PASSPORT", "EIA_TEST"). */
    Optional<DocumentType> findByCode(String code);

    boolean existsByCode(String code);
}
