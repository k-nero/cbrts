package com.equifreight.repository;

import com.equifreight.entity.Club;
import com.equifreight.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface UserRepository extends JpaRepository<User, UUID>, JpaSpecificationExecutor<User> {
    User getByEmail(String email);

    @Query("SELECT u FROM User u LEFT JOIN FETCH u.roles WHERE u.email = :email")
    Optional<User> findByEmailWithRoles(@Param("email") String email);

    /**
     * The customer's club; empty for staff and for a customer not yet linked to one.
     */
    @Query("select u.club from User u where u.id = :userId")
    Optional<Club> findClubByUserId(@Param("userId") UUID userId);
}
