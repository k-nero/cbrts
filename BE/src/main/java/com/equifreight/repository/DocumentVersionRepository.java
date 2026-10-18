package com.equifreight.repository;

import com.equifreight.entity.DocumentVersion;
import com.equifreight.entity.enums.DocumentReview;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Repository for versioned document uploads attached to checklist items (append-only).
 */
@Repository
public interface DocumentVersionRepository extends JpaRepository<DocumentVersion, UUID>,
        JpaSpecificationExecutor<DocumentVersion> {

    /**
     * Find all document versions of a checklist item ordered by version descending.
     */
    List<DocumentVersion> findByChecklistItemIdOrderByVersionNoDesc(UUID checklistItemId);

    /**
     * Find the maximum version number for a checklist item.
     */
    @Query("SELECT MAX(dv.versionNo) FROM DocumentVersion dv WHERE dv.checklistItem.id = :checklistItemId")
    Optional<Short> findMaxVersionNoByChecklistItemId(@Param("checklistItemId") UUID checklistItemId);

    /**
     * Pending reviews for the Transport Specialist inbox with pagination.
     */
    @Query(value = """
            SELECT dv FROM DocumentVersion dv
            JOIN FETCH dv.checklistItem ci
            JOIN FETCH ci.job j
            WHERE dv.review = :review
            ORDER BY dv.uploadedAt ASC
            """,
            countQuery = "SELECT count(dv) FROM DocumentVersion dv WHERE dv.review = :review")
    Page<DocumentVersion> findAllByReview(@Param("review") DocumentReview review, Pageable pageable);

    /**
     * Unpaginated pending reviews list.
     */
    @Query("""
            SELECT dv FROM DocumentVersion dv
            JOIN FETCH dv.checklistItem ci
            JOIN FETCH ci.job j
            WHERE dv.review = :review
            ORDER BY dv.uploadedAt ASC
            """)
    List<DocumentVersion> findAllByReview(@Param("review") DocumentReview review);
}
