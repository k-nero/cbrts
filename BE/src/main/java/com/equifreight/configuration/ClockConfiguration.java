package com.equifreight.configuration;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.time.Clock;

/** The clock every day-counting rule reads "today" from, in the business time zone; tests pin it. */
@Configuration
public class ClockConfiguration {

    @Bean
    public Clock clock() {
        return Clock.system(BusinessTime.ZONE);
    }
}
