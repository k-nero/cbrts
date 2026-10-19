package com.equifreight.repository;

import com.equifreight.entity.Authority;
import com.equifreight.entity.enums.AuthorityKind;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

@Repository
public interface AuthorityRepository extends JpaRepository<Authority, UUID>, JpaSpecificationExecutor<Authority> {

    /**
     * Lấy danh sách cơ quan chức năng theo quốc gia.
     */
    Optional<Authority> findByName(String name);

    List<Authority> findByCountryCode(String countryCode);

    /**
     * Lấy danh sách theo loại cơ quan: VETERINARY | CUSTOMS | QUARANTINE.
     */
    List<Authority> findByKind(AuthorityKind kind);

    /**
     * Lấy theo quốc gia và loại cơ quan.
     */
    List<Authority> findByCountryCodeAndKind(String countryCode, AuthorityKind kind);
}
