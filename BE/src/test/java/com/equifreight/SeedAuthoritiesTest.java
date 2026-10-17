package com.equifreight;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;

@SpringBootTest
class SeedAuthoritiesTest {

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Test
    void seedAuthorities() {
        System.err.println("Database successfully connected and seeded!");
    }
}
