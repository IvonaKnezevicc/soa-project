package com.soa.tours.service;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

import com.soa.tours.dto.CreateTourReviewRequest;
import com.soa.tours.dto.CreateKeyPointRequest;
import com.soa.tours.dto.CreateTourRequest;
import com.soa.tours.dto.KeyPointResponse;
import com.soa.tours.dto.TourReviewResponse;
import com.soa.tours.dto.TourResponse;
import com.soa.tours.dto.TouristPositionResponse;
import com.soa.tours.dto.UpdateKeyPointRequest;
import com.soa.tours.dto.UpdateTourStatusRequest;
import com.soa.tours.dto.UpdateTouristPositionRequest;
import com.soa.tours.exception.ApiException;
import com.soa.tours.model.KeyPoint;
import com.soa.tours.model.Tour;
import com.soa.tours.model.TourReview;
import com.soa.tours.model.TourStatus;
import com.soa.tours.model.TouristPosition;
import com.soa.tours.repository.TouristPositionRepository;
import com.soa.tours.repository.TourReviewRepository;
import com.soa.tours.repository.TourRepository;
import com.soa.tours.security.CurrentUser;

@Service
public class TourService {

    private final TourRepository tourRepository;
    private final TouristPositionRepository touristPositionRepository;
    private final TourReviewRepository tourReviewRepository;

    public TourService(
        TourRepository tourRepository,
        TouristPositionRepository touristPositionRepository,
        TourReviewRepository tourReviewRepository
    ) {
        this.tourRepository = tourRepository;
        this.touristPositionRepository = touristPositionRepository;
        this.tourReviewRepository = tourReviewRepository;
    }

    public TourResponse createTour(CreateTourRequest request, CurrentUser currentUser) {
        if (!"guide".equals(currentUser.getRole())) {
            throw new ApiException(HttpStatus.FORBIDDEN, "only guide users can create tours");
        }

        Instant now = Instant.now();

        Tour tour = new Tour();
        tour.setAuthorId(currentUser.getUserId());
        tour.setAuthorUsername(currentUser.getUsername());
        tour.setName(request.getName().trim());
        tour.setDescription(request.getDescription().trim());
        tour.setDifficulty(request.getDifficulty());
        tour.setTags(request.getTags().stream().map(String::trim).filter(tag -> !tag.isEmpty()).distinct().toList());
        if (tour.getTags().isEmpty()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "at least one tag is required");
        }
        tour.setStatus(TourStatus.DRAFT);
        tour.setPrice(BigDecimal.ZERO);
        tour.setCreatedAt(now);
        tour.setUpdatedAt(now);

        Tour savedTour = tourRepository.save(tour);
        return toResponse(savedTour);
    }

    public List<TourResponse> getToursForCurrentAuthor(CurrentUser currentUser) {
        if (!"guide".equals(currentUser.getRole())) {
            throw new ApiException(HttpStatus.FORBIDDEN, "only guide users can view authored tours");
        }

        return tourRepository.findByAuthorUsernameOrderByCreatedAtDesc(currentUser.getUsername())
            .stream()
            .map(this::toResponse)
            .toList();
    }

    public List<TourResponse> getPublishedTours(CurrentUser currentUser) {
        if (!"tourist".equals(currentUser.getRole())) {
            throw new ApiException(HttpStatus.FORBIDDEN, "only tourist users can view published tours");
        }

        return tourRepository.findByStatusOrderByCreatedAtDesc(TourStatus.PUBLISHED)
            .stream()
            .map(this::toResponse)
            .toList();
    }

    public TourResponse getTourById(String tourId, CurrentUser currentUser) {
        Tour tour = findOwnedTour(tourId, currentUser);
        return toResponse(tour);
    }

    public TourResponse updateTourStatus(String tourId, UpdateTourStatusRequest request, CurrentUser currentUser) {
        Tour tour = findOwnedTour(tourId, currentUser);

        tour.setStatus(request.getStatus());
        tour.setUpdatedAt(Instant.now());

        Tour savedTour = tourRepository.save(tour);
        return toResponse(savedTour);
    }

    public TourResponse addKeyPoint(String tourId, CreateKeyPointRequest request, CurrentUser currentUser) {
        Tour tour = findOwnedTour(tourId, currentUser);

        KeyPoint keyPoint = new KeyPoint();
        keyPoint.setId(UUID.randomUUID().toString());
        keyPoint.setName(request.getName().trim());
        keyPoint.setDescription(request.getDescription().trim());
        keyPoint.setImage(normalizeImage(request.getImage()));
        keyPoint.setLatitude(request.getLatitude());
        keyPoint.setLongitude(request.getLongitude());
        keyPoint.setOrder(tour.getKeyPoints().size() + 1);

        tour.getKeyPoints().add(keyPoint);
        tour.setUpdatedAt(Instant.now());

        Tour savedTour = tourRepository.save(tour);
        return toResponse(savedTour);
    }

    public TourResponse updateKeyPoint(String tourId, String keyPointId, UpdateKeyPointRequest request, CurrentUser currentUser) {
        Tour tour = findOwnedTour(tourId, currentUser);
        KeyPoint keyPoint = findKeyPoint(tour, keyPointId);

        keyPoint.setName(request.getName().trim());
        keyPoint.setDescription(request.getDescription().trim());
        keyPoint.setImage(normalizeImage(request.getImage()));
        keyPoint.setLatitude(request.getLatitude());
        keyPoint.setLongitude(request.getLongitude());
        tour.setUpdatedAt(Instant.now());

        Tour savedTour = tourRepository.save(tour);
        return toResponse(savedTour);
    }

    public TourResponse deleteKeyPoint(String tourId, String keyPointId, CurrentUser currentUser) {
        Tour tour = findOwnedTour(tourId, currentUser);
        KeyPoint keyPoint = findKeyPoint(tour, keyPointId);

        tour.getKeyPoints().remove(keyPoint);
        reindexKeyPoints(tour);
        tour.setUpdatedAt(Instant.now());

        Tour savedTour = tourRepository.save(tour);
        return toResponse(savedTour);
    }

    public TouristPositionResponse getCurrentTouristPosition(CurrentUser currentUser) {
        ensureTourist(currentUser);

        TouristPosition position = touristPositionRepository.findByTouristUsername(currentUser.getUsername())
            .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "tourist position not found"));

        return toTouristPositionResponse(position);
    }

    public TouristPositionResponse updateCurrentTouristPosition(
        UpdateTouristPositionRequest request,
        CurrentUser currentUser
    ) {
        ensureTourist(currentUser);

        TouristPosition position = touristPositionRepository.findByTouristUsername(currentUser.getUsername())
            .orElseGet(TouristPosition::new);

        position.setTouristId(currentUser.getUserId());
        position.setTouristUsername(currentUser.getUsername());
        position.setLatitude(request.getLatitude());
        position.setLongitude(request.getLongitude());
        position.setUpdatedAt(Instant.now());

        TouristPosition savedPosition = touristPositionRepository.save(position);
        return toTouristPositionResponse(savedPosition);
    }

    public List<TourReviewResponse> getTourReviews(String tourId, CurrentUser currentUser) {
        findVisibleTour(tourId, currentUser);

        return tourReviewRepository.findByTourIdOrderByCreatedAtDesc(tourId)
            .stream()
            .map(this::toTourReviewResponse)
            .toList();
    }

    public TourReviewResponse createTourReview(
        String tourId,
        CreateTourReviewRequest request,
        CurrentUser currentUser
    ) {
        ensureTourist(currentUser);

        Tour tour = tourRepository.findById(tourId)
            .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "tour not found"));

        if (tour.getStatus() != TourStatus.PUBLISHED) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "only published tours can be reviewed");
        }

        if (tourReviewRepository.existsByTourIdAndTouristUsername(tourId, currentUser.getUsername())) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "you already reviewed this tour");
        }

        TourReview review = new TourReview();
        review.setTourId(tour.getId());
        review.setTourName(tour.getName());
        review.setTouristId(currentUser.getUserId());
        review.setTouristUsername(currentUser.getUsername());
        review.setRating(request.getRating());
        review.setComment(request.getComment().trim());
        review.setVisitedAt(request.getVisitedAt());
        review.setCreatedAt(Instant.now());
        review.setImages(normalizeImages(request.getImages()));

        TourReview savedReview = tourReviewRepository.save(review);
        return toTourReviewResponse(savedReview);
    }

    private Tour findOwnedTour(String tourId, CurrentUser currentUser) {
        if (!"guide".equals(currentUser.getRole())) {
            throw new ApiException(HttpStatus.FORBIDDEN, "only guide users can manage tours");
        }

        Tour tour = tourRepository.findById(tourId)
            .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "tour not found"));

        if (!tour.getAuthorUsername().equals(currentUser.getUsername())) {
            throw new ApiException(HttpStatus.FORBIDDEN, "you can manage only your own tours");
        }

        return tour;
    }

    private Tour findVisibleTour(String tourId, CurrentUser currentUser) {
        Tour tour = tourRepository.findById(tourId)
            .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "tour not found"));

        if (tour.getStatus() == TourStatus.PUBLISHED) {
            return tour;
        }

        if ("guide".equals(currentUser.getRole()) && tour.getAuthorUsername().equals(currentUser.getUsername())) {
            return tour;
        }

        throw new ApiException(HttpStatus.FORBIDDEN, "tour is not available");
    }

    private void ensureTourist(CurrentUser currentUser) {
        if (!"tourist".equals(currentUser.getRole())) {
            throw new ApiException(HttpStatus.FORBIDDEN, "only tourist users can manage current position");
        }
    }

    private KeyPoint findKeyPoint(Tour tour, String keyPointId) {
        return tour.getKeyPoints().stream()
            .filter(item -> item.getId().equals(keyPointId))
            .findFirst()
            .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "key point not found"));
    }

    private void reindexKeyPoints(Tour tour) {
        for (int index = 0; index < tour.getKeyPoints().size(); index++) {
            tour.getKeyPoints().get(index).setOrder(index + 1);
        }
    }

    private String normalizeImage(String image) {
        if (image == null) {
            return "";
        }

        return image.trim();
    }

    private List<String> normalizeImages(List<String> images) {
        if (images == null) {
            return List.of();
        }

        return images.stream()
            .map(String::trim)
            .filter(image -> !image.isEmpty())
            .distinct()
            .toList();
    }

    private TourResponse toResponse(Tour tour) {
        return new TourResponse(
            tour.getId(),
            tour.getAuthorId(),
            tour.getAuthorUsername(),
            tour.getName(),
            tour.getDescription(),
            tour.getDifficulty().getValue(),
            List.copyOf(tour.getTags()),
            tour.getKeyPoints().stream().map(this::toKeyPointResponse).toList(),
            tour.getStatus().getValue(),
            tour.getPrice(),
            tour.getCreatedAt(),
            tour.getUpdatedAt()
        );
    }

    private TouristPositionResponse toTouristPositionResponse(TouristPosition position) {
        return new TouristPositionResponse(
            position.getId(),
            position.getTouristId(),
            position.getTouristUsername(),
            position.getLatitude(),
            position.getLongitude(),
            position.getUpdatedAt()
        );
    }

    private TourReviewResponse toTourReviewResponse(TourReview review) {
        return new TourReviewResponse(
            review.getId(),
            review.getTourId(),
            review.getTourName(),
            review.getTouristId(),
            review.getTouristUsername(),
            review.getRating(),
            review.getComment(),
            review.getVisitedAt(),
            review.getCreatedAt(),
            List.copyOf(review.getImages())
        );
    }

    private KeyPointResponse toKeyPointResponse(KeyPoint keyPoint) {
        return new KeyPointResponse(
            keyPoint.getId(),
            keyPoint.getName(),
            keyPoint.getDescription(),
            keyPoint.getImage(),
            keyPoint.getLatitude(),
            keyPoint.getLongitude(),
            keyPoint.getOrder()
        );
    }
}
