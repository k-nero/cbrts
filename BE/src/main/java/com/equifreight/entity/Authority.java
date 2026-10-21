package com.equifreight.entity;

import com.equifreight.entity.enums.AuthorityKind;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

/*
 * "Cambodia's GDAHP", "Dept. of Animal Health (VN)", "Customs, Mộc Bài".
 */
@Setter
@Getter
@Entity
@Table(name = "authorities")
public class Authority extends BaseEntity {

    @Column(nullable = false, length = 160)
    private String name;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "country_id", nullable = false)
    private Country country;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 12)
    private AuthorityKind kind;

    private Short slaDays;
}
