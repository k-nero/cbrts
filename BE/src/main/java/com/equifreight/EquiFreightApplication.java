package com.equifreight;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class EquiFreightApplication {
    static void main(String[] args) {
        SpringApplication.run(EquiFreightApplication.class, args);
    }
}
