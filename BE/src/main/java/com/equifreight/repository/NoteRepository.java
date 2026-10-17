package com.equifreight.repository;

import com.equifreight.entity.Note;
import com.equifreight.entity.enums.NoteStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface NoteRepository extends JpaRepository<Note, UUID> {

    @Query("""
            SELECT DISTINCT n FROM Note n
            LEFT JOIN FETCH n.club
            LEFT JOIN FETCH n.request
            LEFT JOIN FETCH n.job
            LEFT JOIN FETCH n.checklistItem
            LEFT JOIN FETCH n.createdBy
            LEFT JOIN FETCH n.replies r
            LEFT JOIN FETCH r.author
            WHERE n.routedRole = :routedRole
            ORDER BY n.createdAt ASC
            """)
    List<Note> findByRoutedRoleWithDetails(@Param("routedRole") String routedRole);

    @Query("""
            SELECT DISTINCT n FROM Note n
            LEFT JOIN FETCH n.club
            LEFT JOIN FETCH n.request
            LEFT JOIN FETCH n.job
            LEFT JOIN FETCH n.checklistItem
            LEFT JOIN FETCH n.createdBy
            LEFT JOIN FETCH n.replies r
            LEFT JOIN FETCH r.author
            WHERE n.id = :id
            """)
    Optional<Note> findByIdWithDetails(@Param("id") UUID id);

    List<Note> findByStatus(NoteStatus status);
}
