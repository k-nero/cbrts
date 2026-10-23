package com.equifreight.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

/**
 * One checklist item the escort presented at a border crossing with an immutable trip record.
 * Append-only by the unique (trip_record_id, checklist_item_id) pair: the pair may not be repeated.
 * Foreign keys enforce that both sides must exist and belong to the same job.
 */
@Setter
@Getter
@Entity
@Table(
        name = "trip_record_documents",
        uniqueConstraints =
                @UniqueConstraint(
                        name = "trip_record_documents_trip_record_id_checklist_item_id_key",
                        columnNames = {"trip_record_id", "checklist_item_id"}))
public class TripRecordDocument extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "trip_record_id", nullable = false)
    private TripRecord tripRecord;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "checklist_item_id", nullable = false)
    private ChecklistItem checklistItem;
}
