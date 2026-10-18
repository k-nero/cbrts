package com.equifreight.service;

import com.equifreight.entity.TransportJob;
import com.equifreight.entity.Vehicle;
import com.equifreight.entity.VehicleBooking;
import com.equifreight.entity.VehicleStall;
import com.equifreight.entity.enums.BookingKind;
import com.equifreight.entity.enums.StallSide;
import com.equifreight.entity.enums.StallType;
import com.equifreight.entity.enums.VehicleStatus;
import com.equifreight.exception.BusinessException;
import com.equifreight.exception.ConflictException;
import com.equifreight.exception.ResourceNotFoundException;
import com.equifreight.model.fleet.*;
import com.equifreight.repository.TransportJobRepository;
import com.equifreight.repository.VehicleBookingRepository;
import com.equifreight.repository.VehicleRepository;
import com.equifreight.repository.VehicleStallRepository;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import lombok.extern.log4j.Log4j2;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Log4j2
public class VehicleService {

    private final VehicleRepository vehicleRepository;
    private final VehicleStallRepository vehicleStallRepository;
    private final VehicleBookingRepository vehicleBookingRepository;
    private final TransportJobRepository transportJobRepository;

    public VehicleService(
            VehicleRepository vehicleRepository,
            VehicleStallRepository vehicleStallRepository,
            VehicleBookingRepository vehicleBookingRepository,
            TransportJobRepository transportJobRepository) {
        this.vehicleRepository = vehicleRepository;
        this.vehicleStallRepository = vehicleStallRepository;
        this.vehicleBookingRepository = vehicleBookingRepository;
        this.transportJobRepository = transportJobRepository;
    }

    @Transactional(readOnly = true)
    public Page<VehicleResponse> search(Specification<Vehicle> spec, Pageable pageable) {
        return vehicleRepository.findAll(spec, pageable).map(this::toResponse);
    }

    @Transactional(readOnly = true)
    public List<VehicleResponse> listAllActive() {
        return vehicleRepository.findAllByStatus(VehicleStatus.ACTIVE).stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public VehicleResponse get(UUID id) {
        Vehicle vehicle = vehicleRepository
                .findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Vehicle not found: " + id));
        return toResponse(vehicle);
    }

    @Transactional
    public VehicleResponse create(CreateVehicleRequest request) {
        if (vehicleRepository.existsByCode(request.code())) {
            throw new ConflictException("DUPLICATE_CODE", "Vehicle with code " + request.code() + " already exists");
        }

        Vehicle vehicle = new Vehicle();
        vehicle.setCode(request.code());
        vehicle.setKind(request.kind());
        vehicle.setPayloadKg(request.payloadKg());
        vehicle.setStatus(VehicleStatus.ACTIVE);

        List<VehicleStall> stalls = new ArrayList<>();
        if (request.stalls() != null && !request.stalls().isEmpty()) {
            for (CreateVehicleStallRequest sReq : request.stalls()) {
                VehicleStall stall = new VehicleStall();
                stall.setVehicle(vehicle);
                stall.setPositionNo(sReq.positionNo());
                stall.setStallType(sReq.stallType() != null ? sReq.stallType() : StallType.STANDARD);
                stall.setRowNo(sReq.rowNo());
                stall.setSide(sReq.side() != null ? sReq.side() : StallSide.LEFT);
                stall.setNearRamp(sReq.nearRamp());
                stalls.add(stall);
            }
        }
        vehicle.setStalls(stalls);

        Vehicle saved = vehicleRepository.save(vehicle);
        log.info("Created vehicle {} with {} stalls", saved.getCode(), stalls.size());
        return toResponse(saved);
    }

    @Transactional
    public VehicleResponse update(UUID id, UpdateVehicleRequest request) {
        Vehicle vehicle = vehicleRepository
                .findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Vehicle not found: " + id));

        if (request.payloadKg() != null && request.payloadKg() > 0) {
            vehicle.setPayloadKg(request.payloadKg());
        }
        if (request.status() != null) {
            vehicle.setStatus(request.status());
        }

        return toResponse(vehicleRepository.save(vehicle));
    }

    @Transactional
    public VehicleBookingResponse bookVehicle(VehicleBookingRequest request) {
        Vehicle vehicle = vehicleRepository
                .findById(request.vehicleId())
                .orElseThrow(() -> new ResourceNotFoundException("Vehicle not found: " + request.vehicleId()));

        if (vehicle.getStatus() != VehicleStatus.ACTIVE) {
            throw new BusinessException("Vehicle " + vehicle.getCode() + " is currently in " + vehicle.getStatus()
                    + " and cannot be booked");
        }

        if (!request.startsAt().isBefore(request.endsAt())) {
            throw new ConflictException("INVALID_PERIOD", "Booking start time must be before end time");
        }

        if (request.kind() == BookingKind.JOB && request.jobId() == null) {
            throw new BusinessException("A JOB booking requires a valid jobId");
        }
        if (request.kind() != BookingKind.JOB && request.jobId() != null) {
            throw new BusinessException("A " + request.kind() + " booking cannot have a jobId");
        }

        // BR-F3-04: No double booking. Check overlapping bookings for this vehicle.
        List<VehicleBooking> overlaps = vehicleBookingRepository.findOverlappingBookings(
                vehicle.getId(), request.startsAt(), request.endsAt(), null);
        if (!overlaps.isEmpty()) {
            throw new ConflictException(
                    "DOUBLE_BOOKING",
                    "Vehicle " + vehicle.getCode() + " is already booked between " + request.startsAt() + " and "
                            + request.endsAt());
        }

        TransportJob job = null;
        if (request.jobId() != null) {
            job = transportJobRepository
                    .findById(request.jobId())
                    .orElseThrow(() -> new ResourceNotFoundException("Job not found: " + request.jobId()));
        }

        VehicleBooking booking = new VehicleBooking();
        booking.setVehicle(vehicle);
        booking.setJob(job);
        booking.setKind(request.kind());
        booking.setStartsAt(request.startsAt());
        booking.setEndsAt(request.endsAt());

        try {
            // Flushed here, so a booking that loses a race to the no-overlap constraint is caught below.
            VehicleBooking saved = vehicleBookingRepository.saveAndFlush(booking);
            log.info(
                    "Booked vehicle {} for {} from {} to {}",
                    vehicle.getCode(),
                    request.kind(),
                    request.startsAt(),
                    request.endsAt());
            return toBookingResponse(saved);
        } catch (org.springframework.dao.DataIntegrityViolationException e) {
            throw new ConflictException(
                    "DOUBLE_BOOKING",
                    "Vehicle " + vehicle.getCode() + " is already booked between " + request.startsAt() + " and "
                            + request.endsAt());
        }
    }

    @Transactional(readOnly = true)
    public List<VehicleBookingResponse> getFleetCalendar(Instant rangeStart, Instant rangeEnd) {
        return vehicleBookingRepository.findInDateRange(rangeStart, rangeEnd).stream()
                .map(this::toBookingResponse)
                .toList();
    }

    private VehicleResponse toResponse(Vehicle vehicle) {
        List<VehicleStallResponse> stalls = vehicle.getStalls().stream()
                .map(s -> VehicleStallResponse.builder()
                        .id(s.getId())
                        .positionNo(s.getPositionNo())
                        .stallType(s.getStallType())
                        .rowNo(s.getRowNo())
                        .side(s.getSide())
                        .nearRamp(s.isNearRamp())
                        .build())
                .toList();

        return VehicleResponse.builder()
                .id(vehicle.getId())
                .code(vehicle.getCode())
                .kind(vehicle.getKind())
                .payloadKg(vehicle.getPayloadKg())
                .status(vehicle.getStatus())
                .stallCount(stalls.size())
                .stalls(stalls)
                .build();
    }

    private VehicleBookingResponse toBookingResponse(VehicleBooking booking) {
        return VehicleBookingResponse.builder()
                .id(booking.getId())
                .vehicleId(booking.getVehicle().getId())
                .vehicleCode(booking.getVehicle().getCode())
                .jobId(booking.getJob() != null ? booking.getJob().getId() : null)
                .jobCode(booking.getJob() != null ? booking.getJob().getCode() : null)
                .kind(booking.getKind() != null ? booking.getKind().name() : "JOB")
                .startsAt(booking.getStartsAt())
                .endsAt(booking.getEndsAt())
                .build();
    }
}
