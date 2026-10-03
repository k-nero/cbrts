package com.equifreight.entity;

import com.equifreight.entity.enums.RegulationRuleKind;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

/**
 * A rule is data with parameters, not code: the validity engine (BR-F2-02) evaluates it against the job's dates,
 * e.g. EIA sampled within 60 days ({@code WINDOW_BEFORE_DEPARTURE}, maxDays 60).
 */
@Setter
@Getter
@Entity
@Table(name = "regulation_rules")
public class RegulationRule extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "version_id", nullable = false)
    private RegulationVersion version;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "document_type_id", nullable = false)
    private DocumentType documentType;

    @Column(nullable = false)
    private boolean mandatory = true;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private RegulationRuleKind ruleKind;

    private Short minDays;

    private Short maxDays;

    @Column(length = 500)
    private String description;
}
