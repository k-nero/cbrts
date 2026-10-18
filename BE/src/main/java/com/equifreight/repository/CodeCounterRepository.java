package com.equifreight.repository;

import com.equifreight.entity.CodeCounter;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface CodeCounterRepository extends JpaRepository<CodeCounter, CodeCounter.Key> {}
