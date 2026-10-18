package com.equifreight.repository;

import com.equifreight.entity.QuarantinePeriod;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface QuarantinePeriodRepository extends JpaRepository<QuarantinePeriod, UUID>,
        JpaSpecificationExecutor<QuarantinePeriod> {

    /**
     * Lấy tất cả đợt cách ly của 1 chuyến vận chuyển.
     */
    List<QuarantinePeriod> findByJobId(UUID jobId);

    /**
     * Lấy đợt cách ly theo từng con ngựa trong 1 job.
     */
    List<QuarantinePeriod> findByJobIdAndHorseId(UUID jobId, UUID horseId);

    /**
     * Kiểm tra tất cả đợt cách ly của job đã hoàn thành chưa (completedAt != null).
     */
    @Query("""
            SELECT COUNT(q) = 0 FROM QuarantinePeriod q
            WHERE q.job.id = :jobId AND q.completedAt IS NULL
            """)
    boolean areAllQuarantinesCompleted(@Param("jobId") UUID jobId);

    /**
     * Lấy các đợt cách ly theo địa điểm (trạm kiểm dịch).
     */
    List<QuarantinePeriod> findByPlaceId(UUID placeId);
}
