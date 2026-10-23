package com.equifreight.entity;

import com.equifreight.entity.enums.DocumentCategory;
import com.equifreight.entity.enums.DocumentProvider;
import com.equifreight.entity.enums.DocumentScope;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

/**
 * EQUINE_PASSPORT, EIA_TEST, IMPORT_PERMIT, … Seeded by DataSeeder.
 */
@Setter
@Getter
@Entity
@Table(name = "document_types")
public class DocumentType extends BaseEntity {

    @Column(nullable = false, unique = true, length = 40)
    private String code;

    @Column(nullable = false, length = 120)
    private String name;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private DocumentScope scope;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private DocumentProvider providedBy;

    /** HEALTH documents decide a horse's health status on a shared trip (US-F3-12). */
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 12)
    private DocumentCategory category = DocumentCategory.TRANSPORT;
}
