package com.equifreight.entity;

import com.equifreight.entity.enums.RegulationRole;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

/**
 * The regulation versions a job's checklist was built from (BR-F2-01).
 */
@Setter
@Getter
@Entity
@Table(
        name = "job_regulation_pins",
        uniqueConstraints =
                @UniqueConstraint(
                        name = "job_regulation_pins_job_id_regulation_version_id_key",
                        columnNames = {"job_id", "regulation_version_id"}))
public class JobRegulationPin extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "job_id", nullable = false)
    private TransportJob job;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "regulation_version_id", nullable = false)
    private RegulationVersion regulationVersion;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 12)
    private RegulationRole role;
}
