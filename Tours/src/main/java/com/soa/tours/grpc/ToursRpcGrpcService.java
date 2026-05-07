package com.soa.tours.grpc;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;

import com.soa.tours.model.PurchasedTour;
import com.soa.tours.model.KeyPoint;
import com.soa.tours.model.Tour;
import com.soa.tours.model.TourStatus;
import com.soa.tours.repository.PurchasedTourRepository;
import com.soa.tours.repository.TourRepository;

import io.grpc.stub.StreamObserver;
import net.devh.boot.grpc.server.service.GrpcService;

@GrpcService
@Service
public class ToursRpcGrpcService extends ToursRpcServiceGrpc.ToursRpcServiceImplBase {

    private final TourRepository tourRepository;
    private final PurchasedTourRepository purchasedTourRepository;

    public ToursRpcGrpcService(TourRepository tourRepository, PurchasedTourRepository purchasedTourRepository) {
        this.tourRepository = tourRepository;
        this.purchasedTourRepository = purchasedTourRepository;
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

        List<Tour> tours = tourRepository.findAllById(requestedTourIds);
        GetToursForPurchaseResponse.Builder responseBuilder = GetToursForPurchaseResponse.newBuilder();

        for (String requestedTourId : requestedTourIds) {
            Optional<Tour> maybeTour = tours.stream()
                .filter(item -> requestedTourId.equals(item.getId()))
                .findFirst();

            if (maybeTour.isEmpty()) {
                responseBuilder.addTours(TourForPurchase.newBuilder()
                    .setId(requestedTourId)
                    .setExists(false)
                    .build());
                continue;
            }

            Tour tour = maybeTour.get();
            responseBuilder.addTours(TourForPurchase.newBuilder()
                .setId(valueOrEmpty(tour.getId()))
                .setName(valueOrEmpty(tour.getName()))
                .setStatus(tour.getStatus() == null ? "" : valueOrEmpty(tour.getStatus().getValue()))
                .setPrice((tour.getPrice() == null ? BigDecimal.ZERO : tour.getPrice()).toPlainString())
                .setExists(true)
                .build());
        }

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

        if (touristId.isEmpty()) {
            responseObserver.onNext(CreatePurchasedToursRpcResponse.newBuilder()
                .setSuccess(false)
                .setMessage("tourist_id is required")
                .build());
            responseObserver.onCompleted();
            return;
        }

        if (requestedTourIds.isEmpty()) {
            responseObserver.onNext(CreatePurchasedToursRpcResponse.newBuilder()
                .setSuccess(false)
                .setMessage("tour_ids are required")
                .build());
            responseObserver.onCompleted();
            return;
        }

        List<Tour> tours = tourRepository.findAllById(requestedTourIds);
        if (tours.size() != requestedTourIds.size()) {
            responseObserver.onNext(CreatePurchasedToursRpcResponse.newBuilder()
                .setSuccess(false)
                .setMessage("one or more tours no longer exist")
                .build());
            responseObserver.onCompleted();
            return;
        }

        boolean unavailableTourExists = tours.stream().anyMatch(item -> item.getStatus() != TourStatus.PUBLISHED);
        if (unavailableTourExists) {
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

        responseObserver.onNext(CreatePurchasedToursRpcResponse.newBuilder()
            .setSuccess(true)
            .setMessage("purchased tours created")
            .addAllTourIds(requestedTourIds)
            .build());
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
}
