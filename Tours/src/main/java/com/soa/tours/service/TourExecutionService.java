package com.soa.tours.service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

import com.soa.tours.dto.CompletedKeyPointResponse;
import com.soa.tours.dto.TourExecutionResponse;
import com.soa.tours.exception.ApiException;
import com.soa.tours.model.CompletedKeyPoint;
import com.soa.tours.model.KeyPoint;
import com.soa.tours.model.PurchasedTour;
import com.soa.tours.model.Tour;
import com.soa.tours.model.TourExecution;
import com.soa.tours.model.TourExecutionStatus;
import com.soa.tours.model.TourStatus;
import com.soa.tours.model.TouristPosition;
import com.soa.tours.repository.PurchasedTourRepository;
import com.soa.tours.repository.TourExecutionRepository;
import com.soa.tours.repository.TourRepository;
import com.soa.tours.repository.TouristPositionRepository;
import com.soa.tours.security.CurrentUser;

@Service
public class TourExecutionService {

    private static final double KEY_POINT_REACH_DISTANCE_KM = 0.1D;

    private final TourRepository tourRepository;
    private final PurchasedTourRepository purchasedTourRepository;
    private final TouristPositionRepository touristPositionRepository;
    private final TourExecutionRepository tourExecutionRepository;

    public TourExecutionService(
        TourRepository tourRepository,
        PurchasedTourRepository purchasedTourRepository,
        TouristPositionRepository touristPositionRepository,
        TourExecutionRepository tourExecutionRepository
    ) {
        this.tourRepository = tourRepository;
        this.purchasedTourRepository = purchasedTourRepository;
        this.touristPositionRepository = touristPositionRepository;
        this.tourExecutionRepository = tourExecutionRepository;
    }

    public TourExecutionResponse startTourExecution(String tourId, CurrentUser currentUser) {
        ensureTourist(currentUser);
        return startTourExecution(tourId, currentUser.getUserId(), currentUser.getUsername());
    }

    public TourExecutionResponse startTourExecution(String tourId, String touristId, String touristUsername) {
        String normalizedTourId = normalizeRequired(tourId, "tourId is required");
        String normalizedTouristId = normalizeRequired(touristId, "touristId is required");
        String normalizedTouristUsername = normalizeRequired(touristUsername, "touristUsername is required");

        Tour tour = tourRepository.findById(normalizedTourId)
            .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "tour not found"));

        if (tour.getStatus() != TourStatus.PUBLISHED && tour.getStatus() != TourStatus.ARCHIVED) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "only published or archived tours can be started");
        }

        boolean purchased = purchasedTourRepository.findByTouristIdAndTourIdIn(
            normalizedTouristId,
            List.of(normalizedTourId)
        ).stream().anyMatch(item -> normalizedTourId.equals(item.getTourId()));

        if (!purchased) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "tour must be purchased before starting");
        }

        tourExecutionRepository.findFirstByTouristIdAndStatusOrderByStartedAtDesc(
            normalizedTouristId,
            TourExecutionStatus.ACTIVE
        ).ifPresent(item -> {
            throw new ApiException(HttpStatus.CONFLICT, "tourist already has an active tour execution");
        });

        TouristPosition position = touristPositionRepository.findByTouristUsername(normalizedTouristUsername)
            .orElseThrow(() -> new ApiException(HttpStatus.BAD_REQUEST, "tourist position must be set before starting a tour"));

        Instant now = Instant.now();
        TourExecution execution = new TourExecution();
        execution.setTouristId(normalizedTouristId);
        execution.setTouristUsername(normalizedTouristUsername);
        execution.setTourId(tour.getId());
        execution.setTourName(tour.getName());
        execution.setStatus(TourExecutionStatus.ACTIVE);
        execution.setStartedAt(now);
        execution.setLastActivityAt(now);
        execution.setStartedLatitude(position.getLatitude());
        execution.setStartedLongitude(position.getLongitude());

        return toResponse(tourExecutionRepository.save(execution));
    }

    public TourExecutionResponse getActiveExecution(CurrentUser currentUser) {
        ensureTourist(currentUser);

        TourExecution execution = tourExecutionRepository.findFirstByTouristIdAndStatusOrderByStartedAtDesc(
            currentUser.getUserId(),
            TourExecutionStatus.ACTIVE
        ).orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "active tour execution not found"));

        return toResponse(execution);
    }

    public List<TourExecutionResponse> getMyExecutions(CurrentUser currentUser) {
        ensureTourist(currentUser);

        return tourExecutionRepository.findByTouristIdOrderByStartedAtDesc(currentUser.getUserId())
            .stream()
            .map(this::toResponse)
            .toList();
    }

    public TourExecutionResponse checkExecutionProgress(String executionId, CurrentUser currentUser) {
        ensureTourist(currentUser);
        return checkExecutionProgress(executionId, currentUser.getUserId());
    }

    public TourExecutionResponse checkExecutionProgress(String executionId, String touristId) {
        String normalizedExecutionId = normalizeRequired(executionId, "executionId is required");
        String normalizedTouristId = normalizeRequired(touristId, "touristId is required");

        TourExecution execution = findOwnedExecution(normalizedExecutionId, normalizedTouristId);
        ensureActiveExecution(execution);

        Tour tour = tourRepository.findById(execution.getTourId())
            .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "tour not found"));

        TouristPosition position = touristPositionRepository.findByTouristUsername(execution.getTouristUsername())
            .orElseThrow(() -> new ApiException(HttpStatus.BAD_REQUEST, "tourist position is not set"));

        Set<String> completedKeyPointIds = execution.getCompletedKeyPoints()
            .stream()
            .map(CompletedKeyPoint::getKeyPointId)
            .collect(Collectors.toSet());

        Instant now = Instant.now();
        for (KeyPoint keyPoint : tour.getKeyPoints()) {
            if (completedKeyPointIds.contains(keyPoint.getId())) {
                continue;
            }

            double distance = haversineKm(
                position.getLatitude(),
                position.getLongitude(),
                keyPoint.getLatitude(),
                keyPoint.getLongitude()
            );

            if (distance <= KEY_POINT_REACH_DISTANCE_KM) {
                CompletedKeyPoint completedKeyPoint = new CompletedKeyPoint();
                completedKeyPoint.setKeyPointId(keyPoint.getId());
                completedKeyPoint.setKeyPointName(keyPoint.getName());
                completedKeyPoint.setOrder(keyPoint.getOrder());
                completedKeyPoint.setLatitude(keyPoint.getLatitude());
                completedKeyPoint.setLongitude(keyPoint.getLongitude());
                completedKeyPoint.setReachedAt(now);
                execution.getCompletedKeyPoints().add(completedKeyPoint);
            }
        }

        execution.setLastActivityAt(now);
        return toResponse(tourExecutionRepository.save(execution));
    }

    public TourExecutionResponse completeExecution(String executionId, CurrentUser currentUser) {
        ensureTourist(currentUser);
        TourExecution execution = findOwnedExecution(executionId, currentUser.getUserId());
        ensureActiveExecution(execution);

        Instant now = Instant.now();
        execution.setStatus(TourExecutionStatus.COMPLETED);
        execution.setCompletedAt(now);
        execution.setLastActivityAt(now);

        return toResponse(tourExecutionRepository.save(execution));
    }

    public TourExecutionResponse abandonExecution(String executionId, CurrentUser currentUser) {
        ensureTourist(currentUser);
        TourExecution execution = findOwnedExecution(executionId, currentUser.getUserId());
        ensureActiveExecution(execution);

        Instant now = Instant.now();
        execution.setStatus(TourExecutionStatus.ABANDONED);
        execution.setAbandonedAt(now);
        execution.setLastActivityAt(now);

        return toResponse(tourExecutionRepository.save(execution));
    }

    private TourExecution findOwnedExecution(String executionId, String touristId) {
        TourExecution execution = tourExecutionRepository.findById(executionId)
            .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "tour execution not found"));

        if (!execution.getTouristId().equals(touristId)) {
            throw new ApiException(HttpStatus.FORBIDDEN, "tour execution belongs to another tourist");
        }

        return execution;
    }

    private void ensureTourist(CurrentUser currentUser) {
        if (!"tourist".equals(currentUser.getRole())) {
            throw new ApiException(HttpStatus.FORBIDDEN, "only tourist users can manage tour executions");
        }
    }

    private void ensureActiveExecution(TourExecution execution) {
        if (execution.getStatus() != TourExecutionStatus.ACTIVE) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "tour execution is not active");
        }
    }

    private String normalizeRequired(String value, String message) {
        String normalized = value == null ? "" : value.trim();
        if (normalized.isEmpty()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, message);
        }
        return normalized;
    }

    private double haversineKm(double lat1, double lon1, double lat2, double lon2) {
        double earthRadiusKm = 6371D;
        double dLat = Math.toRadians(lat2 - lat1);
        double dLon = Math.toRadians(lon2 - lon1);
        double latitude1 = Math.toRadians(lat1);
        double latitude2 = Math.toRadians(lat2);

        double a = Math.sin(dLat / 2) * Math.sin(dLat / 2)
            + Math.cos(latitude1) * Math.cos(latitude2) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
        double c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return BigDecimal.valueOf(earthRadiusKm * c).setScale(3, RoundingMode.HALF_UP).doubleValue();
    }

    private TourExecutionResponse toResponse(TourExecution execution) {
        List<CompletedKeyPointResponse> completedKeyPoints = execution.getCompletedKeyPoints() == null
            ? List.of()
            : execution.getCompletedKeyPoints()
                .stream()
                .sorted((left, right) -> Integer.compare(left.getOrder(), right.getOrder()))
                .map(this::toCompletedKeyPointResponse)
                .toList();

        return new TourExecutionResponse(
            execution.getId(),
            execution.getTouristId(),
            execution.getTouristUsername(),
            execution.getTourId(),
            execution.getTourName(),
            execution.getStatus() == null ? "" : execution.getStatus().getValue(),
            execution.getStartedAt(),
            execution.getCompletedAt(),
            execution.getAbandonedAt(),
            execution.getLastActivityAt(),
            execution.getStartedLatitude(),
            execution.getStartedLongitude(),
            completedKeyPoints
        );
    }

    private CompletedKeyPointResponse toCompletedKeyPointResponse(CompletedKeyPoint completedKeyPoint) {
        return new CompletedKeyPointResponse(
            completedKeyPoint.getKeyPointId(),
            completedKeyPoint.getKeyPointName(),
            completedKeyPoint.getOrder(),
            completedKeyPoint.getLatitude(),
            completedKeyPoint.getLongitude(),
            completedKeyPoint.getReachedAt()
        );
    }
}
