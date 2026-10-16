package com.equifreight.repository;

import com.equifreight.entity.Club;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface ClubRepository extends JpaRepository<Club, UUID> {

    Optional<Club> findByBookingEmail(String bookingEmail);
}
