package com.equifreight.repository;

import com.equifreight.entity.User;
import com.equifreight.entity.enums.UserStatus;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface UserRepository extends JpaRepository<User, UUID>, JpaSpecificationExecutor<User> {
    User getByEmail(String email);

    @Query("SELECT u FROM User u LEFT JOIN FETCH u.roles WHERE u.email = :email")
    Optional<User> findByEmailWithRoles(@Param("email") String email);

    /** The club's account (one per club), to notify it of a request's progress. */
    List<User> findByClubId(UUID clubId);

    /** The people who hold a role, oldest account first (the catalog owner a quotation names). */
    @Query("select u from User u join u.roles r where r.name = :role and u.status = :status order by u.createdAt")
    List<User> findByRoleAndStatus(@Param("role") String role, @Param("status") UserStatus status);
}
