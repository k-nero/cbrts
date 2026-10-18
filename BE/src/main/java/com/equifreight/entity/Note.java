package com.equifreight.entity;

import com.equifreight.entity.enums.NoteStatus;
import com.equifreight.entity.enums.NoteTopic;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

/**
 * A customer question about a request or job, routed by topic. Never a free chat.
 */
@Setter
@Getter
@Entity
@Table(name = "notes")
public class Note extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "club_id", nullable = false)
    private Club club;

    /**
     * At least one of request and job is set (DB check).
     */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "request_id")
    private TransportRequest request;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "job_id")
    private TransportJob job;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "checklist_item_id")
    private ChecklistItem checklistItem;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private NoteTopic topic;

    /**
     * A {@link com.equifreight.entity.enums.RoleName}, decided by the topic.
     */
    @Column(nullable = false, length = 30)
    private String routedRole;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "assignee_id")
    private User assignee;

    @Column(nullable = false, length = 160)
    private String subject;

    @Column(nullable = false, columnDefinition = "text")
    private String body;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "created_by", nullable = false)
    private User createdBy;

    private Instant replyDueAt;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 12)
    private NoteStatus status = NoteStatus.OPEN;

    @OneToMany(mappedBy = "note", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("createdAt")
    private List<NoteReply> replies = new ArrayList<>();
}
