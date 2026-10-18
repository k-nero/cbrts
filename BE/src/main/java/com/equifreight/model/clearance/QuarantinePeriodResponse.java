package com.equifreight.model.clearance;

import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;
import lombok.*;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class QuarantinePeriodResponse {
    private UUID id;
    private UUID jobId;
    private UUID horseId;
    private String horseName;
    private UUID placeId;
    private String placeName;
    private LocalDate startsOn;
    private LocalDate endsOn;
    private Instant completedAt;
    private boolean isCompleted;
}
