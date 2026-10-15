package com.equifreight.repository;

import com.equifreight.entity.DocumentVersion;
import com.equifreight.entity.enums.DocumentReview;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface DocumentVersionRepository extends JpaRepository<DocumentVersion, UUID>,
        JpaSpecificationExecutor<DocumentVersion> {

    /**
     * Lấy toàn bộ phiên bản tài liệu của 1 checklist item (sắp xếp mới nhất trước).
     */
    List<DocumentVersion> findByChecklistItemIdOrderByVersionNoDesc(UUID checklistItemId);

    /** Tìm phiên bản mới nhất của 1 checklist item theo số phiên bản. */
    @Query("SELECT MAX(dv.versionNo) FROM DocumentVersion dv WHERE dv.checklistItem.id = :checklistItemId")
    Optional<Short> findMaxVersionNoByChecklistItemId(@Param("checklistItemId") UUID checklistItemId);

    /**
     * Lấy tất cả phiên bản đang chờ duyệt (PENDING) - dành cho Chuyên viên duyệt hồ
     * sơ.
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
