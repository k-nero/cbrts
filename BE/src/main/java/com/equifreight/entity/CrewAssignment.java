package com.equifreight.entity;

import com.equifreight.entity.enums.CrewRole;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.EqualsAndHashCode;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.io.Serializable;
import java.util.UUID;

/** Grooms = ⌈horses ÷ 3⌉ is checked by the application. */
@Setter
@Getter
@Entity
@Table(name = "crew_assignments")
public class CrewAssignment {

    @EmbeddedId
    private Key id = new Key();

    @MapsId("jobId")
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "job_id")
    private TransportJob job;

    @MapsId("userId")
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id")
    private User user;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private CrewRole crewRole;

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @EqualsAndHashCode
    @Embeddable
    public static class Key implements Serializable {
        private UUID jobId;
        private UUID userId;
    }
}
