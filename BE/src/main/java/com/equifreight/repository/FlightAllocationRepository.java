package com.equifreight.repository;

import com.equifreight.entity.FlightAllocation;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface FlightAllocationRepository extends JpaRepository<FlightAllocation, UUID> {}
