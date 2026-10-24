package com.equifreight.repository;

import com.equifreight.entity.Note;
import com.equifreight.entity.enums.NoteStatus;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface NoteRepository extends JpaRepository<Note, UUID> {

    @Query("""
            SELECT DISTINCT n FROM Note n
            LEFT JOIN FETCH n.club
            LEFT JOIN FETCH n.request
            LEFT JOIN FETCH n.job
            LEFT JOIN FETCH n.checklistItem
            LEFT JOIN FETCH n.createdBy
            LEFT JOIN FETCH n.attachedFile
            LEFT JOIN FETCH n.replies r
            LEFT JOIN FETCH r.author
            WHERE n.routedRole IN :routedRoles
            ORDER BY n.createdAt ASC
            """)
    List<Note> findByRoutedRolesWithDetails(@Param("routedRoles") Collection<String> routedRoles);

    @Query("""
            SELECT DISTINCT n FROM Note n
            LEFT JOIN FETCH n.club
            LEFT JOIN FETCH n.request
            LEFT JOIN FETCH n.job
            LEFT JOIN FETCH n.checklistItem
            LEFT JOIN FETCH n.createdBy
            LEFT JOIN FETCH n.attachedFile
            LEFT JOIN FETCH n.replies r
            LEFT JOIN FETCH r.author
            ORDER BY n.createdAt ASC
            """)
    List<Note> findAllWithDetails();

    /** The notes on one of the club's requests, oldest first. */
    @Query("""
            SELECT DISTINCT n FROM Note n
            LEFT JOIN FETCH n.club
            LEFT JOIN FETCH n.request
            LEFT JOIN FETCH n.job
            LEFT JOIN FETCH n.checklistItem
            LEFT JOIN FETCH n.createdBy
            LEFT JOIN FETCH n.attachedFile
            LEFT JOIN FETCH n.replies r
            LEFT JOIN FETCH r.author
            WHERE n.request.id = :requestId AND n.club.id = :clubId
            ORDER BY n.createdAt ASC
            """)
    List<Note> findByRequestAndClubWithDetails(@Param("requestId") UUID requestId, @Param("clubId") UUID clubId);

    @Query("""
            SELECT DISTINCT n FROM Note n
            LEFT JOIN FETCH n.club
            LEFT JOIN FETCH n.request
            LEFT JOIN FETCH n.job
            LEFT JOIN FETCH n.checklistItem
            LEFT JOIN FETCH n.createdBy
            LEFT JOIN FETCH n.attachedFile
            LEFT JOIN FETCH n.replies r
            LEFT JOIN FETCH r.author
            WHERE n.id = :id
            """)
    Optional<Note> findByIdWithDetails(@Param("id") UUID id);

    List<Note> findByStatus(NoteStatus status);
}
