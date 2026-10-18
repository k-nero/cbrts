package com.equifreight.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

/**
 * A racing club or horse owner: the customer. One account per club ({@code users.club_id}).
 */
@Setter
@Getter
@Entity
@Table(name = "clubs")
public class Club extends BaseEntity {

    @Column(nullable = false, length = 160)
    private String name;

    @Column(nullable = false, length = 255)
    private String bookingEmail;

    @Column(length = 20)
    private String phone;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "country_code")
    private Country country;
}
