package com.equifreight.repository;

import com.equifreight.entity.ChecklistItem;
import com.equifreight.entity.enums.ChecklistStatus;
import java.time.LocalDate;
import java.util.Collection;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface ChecklistItemRepository
        extends JpaRepository<ChecklistItem, UUID>, JpaSpecificationExecutor<ChecklistItem> {

    /**
     * Lấy toàn bộ checklist của 1 chuyến vận chuyển.
     */
    List<ChecklistItem> findByJobId(UUID jobId);

    /**
     * Lấy checklist theo trạng thái (VD: lọc items đang IN_REVIEW).
     */
    List<ChecklistItem> findByJobIdAndStatus(UUID jobId, ChecklistStatus status);

    /**
     * Kiểm tra tất cả các items bắt buộc của 1 job đã CLEARED chưa (để mở khóa
     * CLEARANCE_READY).
     */
    @Query("""
            SELECT COUNT(ci) = 0 FROM ChecklistItem ci
            JOIN ci.regulationRule rr
            WHERE ci.job.id = :jobId
              AND rr.mandatory = true
              AND ci.status <> com.equifreight.entity.enums.ChecklistStatus.CLEARED
            """)
    boolean areAllMandatoryItemsCleared(@Param("jobId") UUID jobId);

    /**
     * Lấy tất cả checklist của 1 con ngựa trong 1 job (scope PER_HORSE).
     */
    List<ChecklistItem> findByJobIdAndHorseId(UUID jobId, UUID horseId);

    /**
     * US-F2-02: what the customer still owes on a job that hasn't left, due on one of the given days.
     */
    @Query("""
            SELECT ci FROM ChecklistItem ci
            JOIN FETCH ci.job j
            JOIN FETCH j.request r
            JOIN FETCH r.club
            JOIN FETCH ci.documentType
            LEFT JOIN FETCH ci.horse
            WHERE ci.holder = com.equifreight.entity.enums.ChecklistHolder.CUSTOMER
              AND ci.status <> com.equifreight.entity.enums.ChecklistStatus.CLEARED
              AND ci.dueDate IN :days
              AND j.departedAt IS NULL
            ORDER BY j.code, ci.dueDate
            """)
    List<ChecklistItem> findOwedByCustomerDueOn(@Param("days") Collection<LocalDate> days);
}
