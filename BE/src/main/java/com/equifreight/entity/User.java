package com.equifreight.entity;

import com.equifreight.entity.enums.EscortKind;
import com.equifreight.entity.enums.UserStatus;
import jakarta.persistence.*;
import java.time.Instant;
import java.util.HashSet;
import java.util.Set;
import lombok.Getter;
import lombok.Setter;

@Setter
@Getter
@Entity
@Table(name = "users")
public class User extends BaseEntity {
    @Column(name = "first_name", nullable = false, length = 255)
    private String firstName;

    @Column(name = "last_name", nullable = false, length = 255)
    private String lastName;

    @Column(name = "email", unique = true, length = 255)
    private String email;

    @Column(name = "phone", length = 20)
    private String phone;

    @Column(name = "password", nullable = false, length = 255)
    private String password;

    /**
     * Set for CUSTOMER users, null for staff. One account per club (partial unique index).
     */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "club_id")
    private Club club;

    /**
     * EF-015. Staff only.
     */
    @Column(name = "staff_code", unique = true, length = 10)
    private String staffCode;

    @Enumerated(EnumType.STRING)
    @Column(name = "escort_kind", length = 20)
    private EscortKind escortKind;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20)
    private UserStatus status = UserStatus.ACTIVE;

    @Column(name = "email_verified_at")
    private Instant emailVerifiedAt;

    @Column(name = "locked_until")
    private Instant lockedUntil;

    @Column(name = "last_active_at")
    private Instant lastActiveAt;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "invited_by")
    private User invitedBy;

    @ManyToMany(cascade = {CascadeType.PERSIST, CascadeType.MERGE})
    @JoinTable(
            name = "user_roles",
            joinColumns = @JoinColumn(name = "user_id"),
            inverseJoinColumns = @JoinColumn(name = "role_id"))
    private Set<Role> roles = new HashSet<>();

    /**
     * "Vũ Hải Yến": family name first, as Users & roles and the audit log write names.
     */
    public String displayName() {
        return (lastName + " " + firstName).strip();
    }

    /**
     * How a person is named on a record others read: a customer by their club ("Saigon Turf Club"), as the audit log
     * labels them; anyone else by their own name.
     */
    public String recordName() {
        return club != null ? club.getName() : displayName();
    }
}
