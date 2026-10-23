package com.equifreight.repository;

import com.equifreight.entity.Notification;
import java.time.Instant;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface NotificationRepository extends JpaRepository<Notification, UUID> {

    Page<Notification> findByUserId(UUID userId, Pageable pageable);

    Page<Notification> findByUserIdAndReadAtIsNull(UUID userId, Pageable pageable);

    Optional<Notification> findByIdAndUserId(UUID id, UUID userId);

    long countByUserIdAndReadAtIsNull(UUID userId);

    /**
     * Writes one notification. A row with a dedupe key replaces the recipient's unread row with the same key and moves
     * it to the top, so a notice repeated before it is read stays one row.
     */
    @Modifying
    @Query(nativeQuery = true, value = """
                    insert into notifications (user_id, kind, title, body, entity_type, entity_id, entity_code,
                                               link_path, dedupe_key, created_at, updated_at)
                    values (:userId, cast(:kind as NotificationKind), :title, cast(:body as varchar),
                            cast(:entityType as NotificationSubject), :entityId, :entityCode, :linkPath,
                            cast(:dedupeKey as varchar), now(), now())
                    on conflict (user_id, dedupe_key) where read_at is null and dedupe_key is not null
                    do update set kind        = excluded.kind,
                                  title       = excluded.title,
                                  body        = excluded.body,
                                  entity_type = excluded.entity_type,
                                  entity_id   = excluded.entity_id,
                                  entity_code = excluded.entity_code,
                                  link_path   = excluded.link_path,
                                  created_at  = excluded.created_at,
                                  updated_at  = excluded.updated_at
                    """)
    void upsert(
            @Param("userId") UUID userId,
            @Param("kind") String kind,
            @Param("title") String title,
            @Param("body") String body,
            @Param("entityType") String entityType,
            @Param("entityId") UUID entityId,
            @Param("entityCode") String entityCode,
            @Param("linkPath") String linkPath,
            @Param("dedupeKey") String dedupeKey);

    @Modifying
    @Query("update Notification n set n.readAt = :at, n.updatedAt = :at where n.user.id = :userId and n.readAt is null")
    int markAllRead(@Param("userId") UUID userId, @Param("at") Instant at);
}
