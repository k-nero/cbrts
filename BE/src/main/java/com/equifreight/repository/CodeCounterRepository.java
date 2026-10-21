package com.equifreight.repository;

import com.equifreight.entity.CodeCounter;
import com.equifreight.entity.enums.CodePrefix;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

/**
 * Issues the next number for a prefix and year. The upsert locks the counter row until the creating
 * transaction commits, so two transactions never get the same number, and a rolled-back one never
 * commits its number. findById and save stay for the demo seeder, which moves a counter past seeded codes.
 */
public interface CodeCounterRepository extends JpaRepository<CodeCounter, UUID> {

    @Query(
            value = "insert into code_counters (id, created_at, updated_at, prefix, year, last_value)"
                    + " values (uuidv7(), now(), now(), cast(:prefix as CodePrefix), :year, 1)"
                    + " on conflict (prefix, year) do update set last_value = code_counters.last_value + 1"
                    + " returning last_value",
            nativeQuery = true)
    int nextValue(@Param("prefix") String prefix, @Param("year") short year);

    /** The seeder's lookup, to move a counter past codes it wrote directly. */
    Optional<CodeCounter> findByPrefixAndYear(CodePrefix prefix, short year);
}
