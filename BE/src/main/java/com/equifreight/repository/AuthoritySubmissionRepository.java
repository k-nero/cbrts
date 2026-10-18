package com.equifreight.repository;

import com.equifreight.entity.AuthoritySubmission;
import com.equifreight.entity.enums.SubmissionStatus;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface AuthoritySubmissionRepository
        extends JpaRepository<AuthoritySubmission, UUID>, JpaSpecificationExecutor<AuthoritySubmission> {

    /**
     * Lấy toàn bộ đợt trình hồ sơ của 1 chuyến vận chuyển.
     */
    List<AuthoritySubmission> findByJobId(UUID jobId);

    /**
     * Lấy theo tiến độ xử lý (VD: chỉ lấy các đợt đang FILED hoặc chờ
     * ADDITIONAL_INFO).
     */
    List<AuthoritySubmission> findByJobIdAndStatus(UUID jobId, SubmissionStatus status);

    /**
     * Lấy danh sách theo cơ quan chức năng tiếp nhận.
     */
    List<AuthoritySubmission> findByAuthorityId(UUID authorityId);

    /**
     * Kiểm tra xem job có bất kỳ đợt trình nào bị REFUSED chưa.
     */
    @Query("""
            SELECT COUNT(s) > 0 FROM AuthoritySubmission s
            WHERE s.job.id = :jobId AND s.status = com.equifreight.entity.enums.SubmissionStatus.REFUSED
            """)
    boolean hasRefusedSubmission(@Param("jobId") UUID jobId);
}
