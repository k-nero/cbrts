package com.equifreight.repository;

import com.equifreight.entity.StoredFile;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

/**
 * Files reach a job through document versions, incident photos, horse condition logs and authority filing results.
 * A file referenced from none of them is an orphan.
 */
@Repository
public interface StoredFileRepository extends JpaRepository<StoredFile, UUID> {

    /**
     * True when the file is a document version or a filing result on a job requested by {@code clubId}.
     */
    @Query(value = """
            select exists (
                select 1
                from (select ci.job_id
                      from document_versions dv
                      join checklist_items ci on ci.id = dv.checklist_item_id
                      where dv.file_id = :fileId
                      union all
                      select tr.job_id
                      from condition_log_files clf
                      join condition_logs cl on cl.id = clf.condition_log_id
                      join trip_records tr on tr.id = cl.trip_record_id
                      where clf.file_id = :fileId
                      union all
                      select s.job_id from authority_submissions s where s.result_file_id = :fileId) j
                join transport_jobs tj on tj.id = j.job_id
                join transport_requests tr on tr.id = tj.request_id
                where tr.club_id = :clubId)
            """, nativeQuery = true)
    boolean isOnClubJob(@Param("fileId") UUID fileId, @Param("clubId") UUID clubId);

    /**
     * True when the file is attached to any job {@code userId} is crewing.
     */
    @Query(value = """
            select exists (
                select 1
                from (select ci.job_id
                      from document_versions dv
                      join checklist_items ci on ci.id = dv.checklist_item_id
                      where dv.file_id = :fileId
                      union all
                      select i.job_id
                      from incident_files f
                      join incidents i on i.id = f.incident_id
                      where f.file_id = :fileId
                      union all
                      select tr.job_id
                      from condition_log_files clf
                      join condition_logs cl on cl.id = clf.condition_log_id
                      join trip_records tr on tr.id = cl.trip_record_id
                      where clf.file_id = :fileId
                      union all
                      select s.job_id from authority_submissions s where s.result_file_id = :fileId) j
                join crew_assignments ca on ca.job_id = j.job_id
                where ca.user_id = :userId)
            """, nativeQuery = true)
    boolean isOnCrewJob(@Param("fileId") UUID fileId, @Param("userId") UUID userId);

    /**
     * True when anything already points at the file, so it can't be attached again.
     */
    @Query(value = """
            select exists (select 1 from document_versions where file_id = :fileId)
                or exists (select 1 from incident_files where file_id = :fileId)
                or exists (select 1 from condition_log_files where file_id = :fileId)
                or exists (select 1 from authority_submissions where result_file_id = :fileId)
            """, nativeQuery = true)
    boolean isAttached(@Param("fileId") UUID fileId);

    /**
     * Uploads created before {@code cutoff} that nothing points at, oldest first.
     */
    @Query(value = """
            select f.* from files f
            where f.created_at < :cutoff
              and not exists (select 1 from document_versions dv where dv.file_id = f.id)
              and not exists (select 1 from incident_files i where i.file_id = f.id)
              and not exists (select 1 from condition_log_files clf where clf.file_id = f.id)
              and not exists (select 1 from authority_submissions s where s.result_file_id = f.id)
            order by f.created_at
            limit :limit
            """, nativeQuery = true)
    List<StoredFile> findOrphans(@Param("cutoff") Instant cutoff, @Param("limit") int limit);

    /**
     * Deletes the row right away, so a foreign key still pointing at it fails here rather than at commit.
     */
    @Modifying
    @Query("delete from StoredFile f where f.id = :id")
    int deleteNow(@Param("id") UUID id);
}
