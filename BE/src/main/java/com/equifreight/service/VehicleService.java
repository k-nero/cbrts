package com.equifreight.service;

import com.equifreight.entity.TransportJob;
import com.equifreight.entity.Vehicle;
import com.equifreight.entity.VehicleBooking;
import com.equifreight.entity.VehicleStall;
import com.equifreight.entity.enums.BookingKind;
import com.equifreight.entity.enums.StallSide;
import com.equifreight.entity.enums.StallType;
import com.equifreight.entity.enums.VehicleStatus;
import com.equifreight.exception.ConflictException;
import com.equifreight.exception.ResourceNotFoundException;
import com.equifreight.model.fleet.*;
import com.equifreight.repository.TransportJobRepository;
import com.equifreight.repository.VehicleBookingRepository;
import com.equifreight.repository.VehicleRepository;
import com.equifreight.repository.VehicleStallRepository;
import lombok.extern.log4j.Log4j2;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Service
@Log4j2
public class VehicleService {

    private final VehicleRepository vehicleRepository;
    private final VehicleStallRepository vehicleStallRepository;
    private final VehicleBookingRepository vehicleBookingRepository;
    private final TransportJobRepository transportJobRepository;

    public VehicleService(VehicleRepository vehicleRepository,
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
        return vehicleRepository.findAllByStatus(VehicleStatus.ACTIVE)
                .stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public VehicleResponse get(UUID id) {
        Vehicle vehicle = vehicleRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Vehicle not found: " + id));
        return toResponse(vehicle);
    }

    @Transactional
    public VehicleResponse create(CreateVehicleRequest request) {
        if (vehicleRepository.existsByCode(request.getCode())) {
            throw new ConflictException("DUPLICATE_CODE", "Vehicle with code " + request.getCode() + " already exists");
        }

        Vehicle vehicle = new Vehicle();
        vehicle.setCode(request.getCode());
        vehicle.setKind(request.getKind());
        vehicle.setPayloadKg(request.getPayloadKg());
        vehicle.setStatus(VehicleStatus.ACTIVE);

        List<VehicleStall> stalls = new ArrayList<>();
        if (request.getStalls() != null && !request.getStalls().isEmpty()) {
            for (CreateVehicleStallRequest sReq : request.getStalls()) {
                VehicleStall stall = new VehicleStall();
                stall.setVehicle(vehicle);
                stall.setPositionNo(sReq.getPositionNo());
                stall.setStallType(sReq.getStallType() != null ? sReq.getStallType() : StallType.STANDARD);
                stall.setRowNo(sReq.getRowNo());
                stall.setSide(sReq.getSide() != null ? sReq.getSide() : StallSide.LEFT);
                stall.setNearRamp(sReq.isNearRamp());
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
        Vehicle vehicle = vehicleRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Vehicle not found: " + id));

        if (request.getPayloadKg() != null && request.getPayloadKg() > 0) {
            vehicle.setPayloadKg(request.getPayloadKg());
        }
        if (request.getStatus() != null) {
            vehicle.setStatus(request.getStatus());
        }

        return toResponse(vehicleRepository.save(vehicle));
    }

    @Transactional
    public VehicleBookingResponse bookVehicle(VehicleBookingRequest request) {
        Vehicle vehicle = vehicleRepository.findById(request.getVehicleId())
                .orElseThrow(() -> new ResourceNotFoundException("Vehicle not found: " + request.getVehicleId()));

        if (!request.getStartsAt().isBefore(request.getEndsAt())) {
            throw new ConflictException("INVALID_PERIOD", "Booking start time must be before end time");
        }

        // BR-F3-04: No double booking. Check overlapping bookings for this vehicle.
        List<VehicleBooking> overlaps = vehicleBookingRepository.findOverlappingBookings(
                vehicle.getId(), request.getStartsAt(), request.getEndsAt(), null);
        if (!overlaps.isEmpty()) {
            throw new ConflictException("DOUBLE_BOOKING", "Vehicle " + vehicle.getCode() + " is already booked between "
                    + request.getStartsAt() + " and " + request.getEndsAt());
        }

        TransportJob job = null;
        if (request.getJobId() != null) {
            job = transportJobRepository.findById(request.getJobId())
                    .orElseThrow(() -> new ResourceNotFoundException("Job not found: " + request.getJobId()));
        }

        BookingKind bookingKind;
        try {
            bookingKind = BookingKind.valueOf(request.getKind().toUpperCase());
        } catch (IllegalArgumentException e) {
            bookingKind = BookingKind.JOB;
        }

        VehicleBooking booking = new VehicleBooking();
        booking.setVehicle(vehicle);
        booking.setJob(job);
        booking.setKind(bookingKind);
        booking.setStartsAt(request.getStartsAt());
        booking.setEndsAt(request.getEndsAt());

        VehicleBooking saved = vehicleBookingRepository.save(booking);
        log.info("Booked vehicle {} for {} from {} to {}", vehicle.getCode(), request.getKind(), request.getStartsAt(), request.getEndsAt());
        return toBookingResponse(saved);
    }

    @Transactional(readOnly = true)
    public List<VehicleBookingResponse> getFleetCalendar(Instant rangeStart, Instant rangeEnd) {
        return vehicleBookingRepository.findInDateRange(rangeStart, rangeEnd)
                .stream()
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
