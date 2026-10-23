package com.equifreight.repository;

import java.util.UUID;

/** How many open jobs one person is on, in one role. */
public interface UserJobCount {
    UUID getUserId();

    long getJobs();
}
