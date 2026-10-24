package com.equifreight.entity;

import com.equifreight.entity.enums.ServiceClass;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

/**
 * One job's consignment on a flight (US-F3-15): its own air waybill, the stall positions it takes and its service
 * class. Jobs on one trip share the flight; their paperwork, airport customs and documents stay per job.
 */
@Setter
@Getter
@Entity
@Table(
        name = "flight_allocations",
        uniqueConstraints =
                @UniqueConstraint(
                        name = "flight_allocations_flight_id_job_id_key",
                        columnNames = {"flight_id", "job_id"}))
public class FlightAllocation extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "flight_id", nullable = false)
    private Flight flight;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "job_id", nullable = false)
    private TransportJob job;

    /** Unique on the flight. */
    @Column(length = 20)
    private String airWaybill;

    private Short stallPositions;

    @Enumerated(EnumType.STRING)
    @Column(length = 10)
    private ServiceClass serviceClass;
}
