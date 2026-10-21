package com.equifreight.entity;

import com.equifreight.entity.enums.CrewRole;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

/**
 * One person on a job's crew. Grooms = ⌈horses ÷ 3⌉ is checked by the application.
 */
@Setter
@Getter
@Entity
@Table(
        name = "crew_assignments",
        uniqueConstraints =
                @UniqueConstraint(
                        name = "crew_assignments_job_id_user_id_key",
                        columnNames = {"job_id", "user_id"}))
public class CrewAssignment extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "job_id", nullable = false)
    private TransportJob job;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private CrewRole crewRole;
}
