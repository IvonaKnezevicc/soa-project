package com.soa.tours.grpc;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import com.soa.tours.model.PurchasedTour;
import com.soa.tours.model.KeyPoint;
import com.soa.tours.model.Tour;
import com.soa.tours.model.TourStatus;
import com.soa.tours.observability.ObservabilityLog;
import com.soa.tours.repository.PurchasedTourRepository;
import com.soa.tours.repository.TourRepository;
import com.soa.tours.service.TourExecutionService;
import com.soa.tours.dto.CompletedKeyPointResponse;
import com.soa.tours.dto.TourExecutionResponse;

import io.grpc.stub.StreamObserver;
import net.devh.boot.grpc.server.service.GrpcService;

@GrpcService
@Service
public class ToursRpcGrpcService extends ToursRpcServiceGrpc.ToursRpcServiceImplBase {

    private static final Logger logger = LoggerFactory.getLogger(ToursRpcGrpcService.class);

    private final TourRepository tourRepository;
    private final PurchasedTourRepository purchasedTourRepository;
    private final TourExecutionService tourExecutionService;

    public ToursRpcGrpcService(
        TourRepository tourRepository,
        PurchasedTourRepository purchasedTourRepository,
        TourExecutionService tourExecutionService
    ) {
        this.tourRepository = tourRepository;
        this.purchasedTourRepository = purchasedTourRepository;
        this.tourExecutionService = tourExecutionService;
    }

    @Override
    public void getPublishedTours(
        GetPublishedToursRequest request,
        StreamObserver<GetPublishedToursResponse> responseObserver
    ) {
        List<Tour> tours = tourRepository.findByStatusOrderByCreatedAtDesc(TourStatus.PUBLISHED);

        GetPublishedToursResponse.Builder responseBuilder = GetPublishedToursResponse.newBuilder();
        for (Tour tour : tours) {
            PublishedTour.Builder itemBuilder = PublishedTour.newBuilder()
                .setId(valueOrEmpty(tour.getId()))
                .setAuthorUsername(valueOrEmpty(tour.getAuthorUsername()))
                .setName(valueOrEmpty(tour.getName()))
                .setDescription(valueOrEmpty(tour.getDescription()))
                .setDifficulty(tour.getDifficulty() == null ? "" : valueOrEmpty(tour.getDifficulty().getValue()))
                .setStatus(tour.getStatus() == null ? "" : valueOrEmpty(tour.getStatus().getValue()));

            if (tour.getTags() != null) {
                itemBuilder.addAllTags(tour.getTags());
            }

            KeyPoint first = extractFirstKeyPoint(tour);
            if (first != null) {
                itemBuilder
                    .setFirstKeyPointName(valueOrEmpty(first.getName()))
                    .setFirstKeyPointLatitude(first.getLatitude())
                    .setFirstKeyPointLongitude(first.getLongitude());
            }

            responseBuilder.addTours(itemBuilder.build());
        }

        responseObserver.onNext(responseBuilder.build());
        responseObserver.onCompleted();
    }

    @Override
    public void publishTour(
        PublishTourRequest request,
        StreamObserver<PublishTourResponse> responseObserver
    ) {
        String tourId = valueOrEmpty(request.getTourId()).trim();
        String authorUsername = valueOrEmpty(request.getAuthorUsername()).trim();

        if (tourId.isEmpty()) {
            responseObserver.onNext(PublishTourResponse.newBuilder()
                .setSuccess(false)
                .setMessage("tour_id is required")
                .build());
            responseObserver.onCompleted();
            return;
        }

        Optional<Tour> maybeTour = tourRepository.findById(tourId);
        if (maybeTour.isEmpty()) {
            responseObserver.onNext(PublishTourResponse.newBuilder()
                .setSuccess(false)
                .setMessage("tour not found")
                .setTourId(tourId)
                .build());
            responseObserver.onCompleted();
            return;
        }

        Tour tour = maybeTour.get();
        if (!authorUsername.isEmpty() && !authorUsername.equals(tour.getAuthorUsername())) {
            responseObserver.onNext(PublishTourResponse.newBuilder()
                .setSuccess(false)
                .setMessage("only the author can publish this tour")
                .setTourId(tourId)
                .build());
            responseObserver.onCompleted();
            return;
        }

        if (tour.getKeyPoints() == null || tour.getKeyPoints().size() < 2) {
            responseObserver.onNext(PublishTourResponse.newBuilder()
                .setSuccess(false)
                .setMessage("tour must contain at least two key points")
                .setTourId(tourId)
                .build());
            responseObserver.onCompleted();
            return;
        }

        if (tour.getDurations() == null || tour.getDurations().isEmpty()) {
            responseObserver.onNext(PublishTourResponse.newBuilder()
                .setSuccess(false)
                .setMessage("at least one duration by transport type is required")
                .setTourId(tourId)
                .build());
            responseObserver.onCompleted();
            return;
        }

        tour.setStatus(TourStatus.PUBLISHED);
        tour.setUpdatedAt(Instant.now());
        tourRepository.save(tour);

        responseObserver.onNext(PublishTourResponse.newBuilder()
            .setSuccess(true)
            .setMessage("tour published")
            .setTourId(valueOrEmpty(tour.getId()))
            .setStatus(TourStatus.PUBLISHED.getValue())
            .build());
        responseObserver.onCompleted();
    }

    @Override
    public void getToursForPurchase(
        GetToursForPurchaseRequest request,
        StreamObserver<GetToursForPurchaseResponse> responseObserver
    ) {
        List<String> requestedTourIds = request.getTourIdsList().stream()
            .map(String::trim)
            .filter(item -> !item.isEmpty())
            .distinct()
            .toList();

        ObservabilityLog.info(
            logger,
            "purchase validation started",
            Map.of("tourIds", requestedTourIds, "tourCount", requestedTourIds.size()));

        List<Tour> tours = tourRepository.findAllById(requestedTourIds);
        GetToursForPurchaseResponse.Builder responseBuilder = GetToursForPurchaseResponse.newBuilder();

        for (String requestedTourId : requestedTourIds) {
            Optional<Tour> maybeTour = tours.stream()
                .filter(item -> requestedTourId.equals(item.getId()))
                .findFirst();

            if (maybeTour.isEmpty()) {
                ObservabilityLog.warn(
                    logger,
                    "purchase validation found missing tour",
                    Map.of("tourId", requestedTourId));
                responseBuilder.addTours(TourForPurchase.newBuilder()
                    .setId(requestedTourId)
                    .setExists(false)
                    .build());
                continue;
            }

            Tour tour = maybeTour.get();
            if (tour.getStatus() != TourStatus.PUBLISHED) {
                ObservabilityLog.warn(
                    logger,
                    "purchase validation found unavailable tour",
                    Map.of("tourId", tour.getId(), "status", tour.getStatus() == null ? "" : tour.getStatus().getValue()));
            }
            responseBuilder.addTours(TourForPurchase.newBuilder()
                .setId(valueOrEmpty(tour.getId()))
                .setName(valueOrEmpty(tour.getName()))
                .setStatus(tour.getStatus() == null ? "" : valueOrEmpty(tour.getStatus().getValue()))
                .setPrice((tour.getPrice() == null ? BigDecimal.ZERO : tour.getPrice()).toPlainString())
                .setExists(true)
                .build());
        }

        ObservabilityLog.info(
            logger,
            "purchase validation completed",
            Map.of("tourCount", requestedTourIds.size()));
        responseObserver.onNext(responseBuilder.build());
        responseObserver.onCompleted();
    }

    @Override
    public void createPurchasedTours(
        CreatePurchasedToursRpcRequest request,
        StreamObserver<CreatePurchasedToursRpcResponse> responseObserver
    ) {
        String touristId = valueOrEmpty(request.getTouristId()).trim();
        List<String> requestedTourIds = request.getTourIdsList().stream()
            .map(String::trim)
            .filter(item -> !item.isEmpty())
            .distinct()
            .toList();

        ObservabilityLog.info(
            logger,
            "purchase creation started",
            Map.of("touristId", touristId, "tourIds", requestedTourIds, "tourCount", requestedTourIds.size()));

        if (touristId.isEmpty()) {
            ObservabilityLog.warn(logger, "purchase creation rejected because touristId is missing", Map.of());
            responseObserver.onNext(CreatePurchasedToursRpcResponse.newBuilder()
                .setSuccess(false)
                .setMessage("tourist_id is required")
                .build());
            responseObserver.onCompleted();
            return;
        }

        if (requestedTourIds.isEmpty()) {
            ObservabilityLog.warn(logger, "purchase creation rejected because no tour ids were supplied", Map.of("touristId", touristId));
            responseObserver.onNext(CreatePurchasedToursRpcResponse.newBuilder()
                .setSuccess(false)
                .setMessage("tour_ids are required")
                .build());
            responseObserver.onCompleted();
            return;
        }

        List<Tour> tours = tourRepository.findAllById(requestedTourIds);
        if (tours.size() != requestedTourIds.size()) {
            ObservabilityLog.warn(
                logger,
                "purchase creation rejected because one or more tours no longer exist",
                Map.of("touristId", touristId, "requestedCount", requestedTourIds.size(), "foundCount", tours.size()));
            responseObserver.onNext(CreatePurchasedToursRpcResponse.newBuilder()
                .setSuccess(false)
                .setMessage("one or more tours no longer exist")
                .build());
            responseObserver.onCompleted();
            return;
        }

        boolean unavailableTourExists = tours.stream().anyMatch(item -> item.getStatus() != TourStatus.PUBLISHED);
        if (unavailableTourExists) {
            ObservabilityLog.warn(
                logger,
                "purchase creation rejected because one or more tours are unavailable",
                Map.of("touristId", touristId, "tourIds", requestedTourIds));
            responseObserver.onNext(CreatePurchasedToursRpcResponse.newBuilder()
                .setSuccess(false)
                .setMessage("one or more tours are no longer available for purchase")
                .build());
            responseObserver.onCompleted();
            return;
        }

        Set<String> existingTourIds = purchasedTourRepository.findByTouristIdAndTourIdIn(touristId, requestedTourIds)
            .stream()
            .map(PurchasedTour::getTourId)
            .collect(Collectors.toSet());

        Instant purchasedAt = Instant.now();
        List<PurchasedTour> newPurchases = requestedTourIds.stream()
            .filter(tourId -> !existingTourIds.contains(tourId))
            .map(tourId -> {
                PurchasedTour purchasedTour = new PurchasedTour();
                purchasedTour.setId(UUID.randomUUID().toString());
                purchasedTour.setTouristId(touristId);
                purchasedTour.setTourId(tourId);
                purchasedTour.setPurchasedAt(purchasedAt);
                return purchasedTour;
            })
            .toList();

        if (!newPurchases.isEmpty()) {
            purchasedTourRepository.saveAll(newPurchases);
        }

        ObservabilityLog.info(
            logger,
            "purchase creation completed",
            Map.of("touristId", touristId, "createdCount", newPurchases.size(), "tourIds", requestedTourIds));

        responseObserver.onNext(CreatePurchasedToursRpcResponse.newBuilder()
            .setSuccess(true)
            .setMessage("purchased tours created")
            .addAllTourIds(requestedTourIds)
            .build());
        responseObserver.onCompleted();
    }

    @Override
    public void startTourExecution(
        StartTourExecutionRequest request,
        StreamObserver<TourExecutionRpcResponse> responseObserver
    ) {
        try {
            TourExecutionResponse execution = tourExecutionService.startTourExecution(
                request.getTourId(),
                request.getTouristId(),
                request.getTouristUsername()
            );
            responseObserver.onNext(toTourExecutionRpcResponse(execution, "tour execution started"));
        } catch (RuntimeException exception) {
            responseObserver.onNext(TourExecutionRpcResponse.newBuilder()
                .setSuccess(false)
                .setMessage(valueOrEmpty(exception.getMessage()))
                .build());
        }
        responseObserver.onCompleted();
    }

    @Override
    public void checkTourExecutionProgress(
        CheckTourExecutionProgressRequest request,
        StreamObserver<TourExecutionRpcResponse> responseObserver
    ) {
        try {
            TourExecutionResponse execution = tourExecutionService.checkExecutionProgress(
                request.getExecutionId(),
                request.getTouristId()
            );
            responseObserver.onNext(toTourExecutionRpcResponse(execution, "tour execution progress checked"));
        } catch (RuntimeException exception) {
            responseObserver.onNext(TourExecutionRpcResponse.newBuilder()
                .setSuccess(false)
                .setMessage(valueOrEmpty(exception.getMessage()))
                .build());
        }
        responseObserver.onCompleted();
    }

    private KeyPoint extractFirstKeyPoint(Tour tour) {
        if (tour.getKeyPoints() == null || tour.getKeyPoints().isEmpty()) {
            return null;
        }
        return tour.getKeyPoints().stream()
            .sorted((left, right) -> Integer.compare(left.getOrder(), right.getOrder()))
            .findFirst()
            .orElse(null);
    }

    private String valueOrEmpty(String value) {
        return value == null ? "" : value;
    }

    private TourExecutionRpcResponse toTourExecutionRpcResponse(
        TourExecutionResponse execution,
        String message
    ) {
        TourExecutionRpcResponse.Builder responseBuilder = TourExecutionRpcResponse.newBuilder()
            .setSuccess(true)
            .setMessage(message)
            .setExecutionId(valueOrEmpty(execution.getId()))
            .setTouristId(valueOrEmpty(execution.getTouristId()))
            .setTouristUsername(valueOrEmpty(execution.getTouristUsername()))
            .setTourId(valueOrEmpty(execution.getTourId()))
            .setTourName(valueOrEmpty(execution.getTourName()))
            .setStatus(valueOrEmpty(execution.getStatus()))
            .setStartedAt(instantOrEmpty(execution.getStartedAt()))
            .setCompletedAt(instantOrEmpty(execution.getCompletedAt()))
            .setAbandonedAt(instantOrEmpty(execution.getAbandonedAt()))
            .setLastActivityAt(instantOrEmpty(execution.getLastActivityAt()))
            .setStartedLatitude(execution.getStartedLatitude())
            .setStartedLongitude(execution.getStartedLongitude());

        if (execution.getCompletedKeyPoints() != null) {
            for (CompletedKeyPointResponse keyPoint : execution.getCompletedKeyPoints()) {
                responseBuilder.addCompletedKeyPoints(CompletedKeyPointRpc.newBuilder()
                    .setKeyPointId(valueOrEmpty(keyPoint.getKeyPointId()))
                    .setKeyPointName(valueOrEmpty(keyPoint.getKeyPointName()))
                    .setOrder(keyPoint.getOrder())
                    .setLatitude(keyPoint.getLatitude())
                    .setLongitude(keyPoint.getLongitude())
                    .setReachedAt(instantOrEmpty(keyPoint.getReachedAt()))
                    .build());
            }
        }

        return responseBuilder.build();
    }

    private String instantOrEmpty(Instant instant) {
        return instant == null ? "" : instant.toString();
    }
}
