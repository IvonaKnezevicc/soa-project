package com.soa.tours.grpc;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

import org.springframework.stereotype.Service;

import com.soa.tours.model.KeyPoint;
import com.soa.tours.model.Tour;
import com.soa.tours.model.TourStatus;
import com.soa.tours.repository.TourRepository;

import io.grpc.stub.StreamObserver;
import net.devh.boot.grpc.server.service.GrpcService;

@GrpcService
@Service
public class ToursRpcGrpcService extends ToursRpcServiceGrpc.ToursRpcServiceImplBase {

    private final TourRepository tourRepository;

    public ToursRpcGrpcService(TourRepository tourRepository) {
        this.tourRepository = tourRepository;
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
