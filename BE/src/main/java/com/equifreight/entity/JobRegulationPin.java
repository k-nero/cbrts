package com.equifreight.entity;

import com.equifreight.entity.enums.RegulationRole;
import jakarta.persistence.*;
import lombok.*;

import java.io.Serializable;
import java.util.UUID;

/**
 * The regulation versions a job's checklist was built from (BR-F2-01).
 */
@Setter
@Getter
@Entity
@Table(name = "job_regulation_pins")
public class JobRegulationPin {

    @EmbeddedId
    private Key id = new Key();

    @MapsId("jobId")
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "job_id")
    private TransportJob job;

    @MapsId("regulationVersionId")
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "regulation_version_id")
    private RegulationVersion regulationVersion;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 12)
    private RegulationRole role;

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @EqualsAndHashCode
    @Embeddable
    public static class Key implements Serializable {
        private UUID jobId;
        private UUID regulationVersionId;
    }
}
