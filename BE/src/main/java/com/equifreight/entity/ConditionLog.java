package com.equifreight.entity;

import com.equifreight.entity.enums.HorseCondition;
import jakarta.persistence.*;
import java.util.HashSet;
import java.util.Set;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.Immutable;

/**
 * A horse's condition at a trip record. Append-only (trigger).
 */
@Setter
@Getter
@Entity
@Immutable
@Table(name = "condition_logs")
public class ConditionLog extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "trip_record_id", nullable = false)
    private TripRecord tripRecord;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "horse_id", nullable = false)
    private Horse horse;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private HorseCondition condition;

    private Boolean drinking;

    private Boolean eating;

    @Column(length = 500)
    private String note;

    /**
     * Photos attached to this condition entry; the join table is append-only.
     */
    @ManyToMany
    @JoinTable(
            name = "condition_log_files",
            joinColumns = @JoinColumn(name = "condition_log_id"),
            inverseJoinColumns = @JoinColumn(name = "file_id"))
    private Set<StoredFile> files = new HashSet<>();
}
