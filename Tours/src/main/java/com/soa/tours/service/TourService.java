package com.soa.tours.service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

import com.soa.tours.dto.CreateTourReviewRequest;
import com.soa.tours.dto.CreateKeyPointRequest;
import com.soa.tours.dto.CreatePurchasedToursRequest;
import com.soa.tours.dto.CreateTourRequest;
import com.soa.tours.dto.KeyPointResponse;
import com.soa.tours.dto.PurchasedTourIdsResponse;
import com.soa.tours.dto.TourDurationResponse;
import com.soa.tours.dto.TourReviewResponse;
import com.soa.tours.dto.TourResponse;
import com.soa.tours.dto.TouristPositionResponse;
import com.soa.tours.dto.UpdateKeyPointRequest;
import com.soa.tours.dto.UpdateTourDurationsRequest;
import com.soa.tours.dto.UpdateTourRequest;
import com.soa.tours.dto.UpdateTourStatusRequest;
import com.soa.tours.dto.UpdateTouristPositionRequest;
import com.soa.tours.exception.ApiException;
import com.soa.tours.model.KeyPoint;
import com.soa.tours.model.PurchasedTour;
import com.soa.tours.model.Tour;
import com.soa.tours.model.TourDuration;
import com.soa.tours.model.TourReview;
import com.soa.tours.model.TourStatus;
import com.soa.tours.model.TouristPosition;
import com.soa.tours.model.TransportType;
import com.soa.tours.repository.PurchasedTourRepository;
import com.soa.tours.repository.TouristPositionRepository;
import com.soa.tours.repository.TourReviewRepository;
import com.soa.tours.repository.TourRepository;
import com.soa.tours.security.CurrentUser;

@Service
public class TourService {

    private final TourRepository tourRepository;
    private final TouristPositionRepository touristPositionRepository;
    private final TourReviewRepository tourReviewRepository;
    private final PurchasedTourRepository purchasedTourRepository;

    public TourService(
        TourRepository tourRepository,
        TouristPositionRepository touristPositionRepository,
        TourReviewRepository tourReviewRepository,
        PurchasedTourRepository purchasedTourRepository
    ) {
        this.tourRepository = tourRepository;
        this.touristPositionRepository = touristPositionRepository;
        this.tourReviewRepository = tourReviewRepository;
        this.purchasedTourRepository = purchasedTourRepository;
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
        tour.setDurations(normalizeDurations(request.getDurations()));
        tour.setStatus(TourStatus.DRAFT);
        tour.setDistanceInKm(0D);
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

        Set<String> purchasedTourIds = purchasedTourRepository.findByTouristId(currentUser.getUserId())
            .stream()
            .map(PurchasedTour::getTourId)
            .collect(Collectors.toSet());

        return tourRepository.findByStatusOrderByCreatedAtDesc(TourStatus.PUBLISHED)
            .stream()
            .map(tour -> toTouristResponse(tour, purchasedTourIds.contains(tour.getId())))
            .toList();
    }

    public com.soa.tours.dto.TourPurchaseInfoResponse getTourPurchaseInfo(String tourId) {
        Tour tour = tourRepository.findById(tourId)
            .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "tour not found"));

        return new com.soa.tours.dto.TourPurchaseInfoResponse(
            tour.getId(),
            tour.getName(),
            tour.getPrice() == null ? BigDecimal.ZERO : tour.getPrice(),
            tour.getStatus() == null ? TourStatus.DRAFT.getValue() : tour.getStatus().getValue()
        );
    }

    public PurchasedTourIdsResponse getPurchasedTourIds(String touristId) {
        touristId = touristId == null ? "" : touristId.trim();
        if (touristId.isEmpty()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "touristId is required");
        }

        List<String> tourIds = purchasedTourRepository.findByTouristId(touristId)
            .stream()
            .map(PurchasedTour::getTourId)
            .distinct()
            .toList();

        return new PurchasedTourIdsResponse(touristId, tourIds);
    }

    public PurchasedTourIdsResponse createPurchasedTours(CreatePurchasedToursRequest request) {
        String touristId = normalizeTouristId(request.getTouristId());
        List<String> requestedTourIds = normalizeTourIds(request.getTourIds());
        validateToursAvailableForPurchase(requestedTourIds);

        Set<String> existingTourIds = purchasedTourRepository.findByTouristIdAndTourIdIn(touristId, requestedTourIds)
            .stream()
            .map(PurchasedTour::getTourId)
            .collect(Collectors.toSet());

        Instant purchasedAt = Instant.now();
        List<PurchasedTour> newPurchases = requestedTourIds.stream()
            .filter(tourId -> !existingTourIds.contains(tourId))
            .map(tourId -> {
                PurchasedTour purchasedTour = new PurchasedTour();
                purchasedTour.setTouristId(touristId);
                purchasedTour.setTourId(tourId);
                purchasedTour.setPurchasedAt(purchasedAt);
                return purchasedTour;
            })
            .toList();

        if (!newPurchases.isEmpty()) {
            purchasedTourRepository.saveAll(newPurchases);
        }

        return new PurchasedTourIdsResponse(touristId, requestedTourIds);
    }

    public PurchasedTourIdsResponse rollbackPurchasedTours(CreatePurchasedToursRequest request) {
        String touristId = normalizeTouristId(request.getTouristId());
        List<String> requestedTourIds = normalizeTourIds(request.getTourIds());
        purchasedTourRepository.deleteByTouristIdAndTourIdIn(touristId, requestedTourIds);
        return new PurchasedTourIdsResponse(touristId, requestedTourIds);
    }

    public TourResponse getTourById(String tourId, CurrentUser currentUser) {
        if ("guide".equals(currentUser.getRole())) {
            Tour tour = findOwnedTour(tourId, currentUser);
            return toResponse(tour);
        }

        if ("tourist".equals(currentUser.getRole())) {
            Tour tour = findVisibleTour(tourId, currentUser);
            boolean purchasedByCurrentUser = purchasedTourRepository.findByTouristIdAndTourIdIn(
                currentUser.getUserId(),
                List.of(tourId)
            ).stream().anyMatch(item -> tourId.equals(item.getTourId()));

            return toTouristResponse(tour, purchasedByCurrentUser);
        }

        throw new ApiException(HttpStatus.FORBIDDEN, "user role is not allowed to view this tour");
    }

    public TourResponse updateTourStatus(String tourId, UpdateTourStatusRequest request, CurrentUser currentUser) {
        Tour tour = findOwnedTour(tourId, currentUser);
        TourStatus requestedStatus = request.getStatus();
        TourStatus currentStatus = tour.getStatus();
        Instant now = Instant.now();

        if (requestedStatus == currentStatus) {
            return toResponse(tour);
        }

        if (currentStatus == TourStatus.DRAFT && requestedStatus == TourStatus.PUBLISHED) {
            validatePublishRequirements(tour);
            tour.setStatus(TourStatus.PUBLISHED);
            tour.setPublishedAt(now);
        } else if (currentStatus == TourStatus.PUBLISHED && requestedStatus == TourStatus.ARCHIVED) {
            tour.setStatus(TourStatus.ARCHIVED);
            tour.setArchivedAt(now);
        } else if (currentStatus == TourStatus.ARCHIVED && requestedStatus == TourStatus.PUBLISHED) {
            validatePublishRequirements(tour);
            tour.setStatus(TourStatus.PUBLISHED);
            tour.setPublishedAt(now);
            tour.setArchivedAt(null);
        } else {
            throw new ApiException(HttpStatus.BAD_REQUEST, "invalid status transition");
        }

        tour.setUpdatedAt(now);

        Tour savedTour = tourRepository.save(tour);
        return toResponse(savedTour);
    }

    public TourResponse addKeyPoint(String tourId, CreateKeyPointRequest request, CurrentUser currentUser) {
        Tour tour = findOwnedTour(tourId, currentUser);
        ensureDraftTour(tour, "key points can be added only while tour is in draft");

        KeyPoint keyPoint = new KeyPoint();
        keyPoint.setId(UUID.randomUUID().toString());
        keyPoint.setName(request.getName().trim());
        keyPoint.setDescription(request.getDescription().trim());
        keyPoint.setImage(normalizeImage(request.getImage()));
        keyPoint.setLatitude(request.getLatitude());
        keyPoint.setLongitude(request.getLongitude());
        keyPoint.setOrder(tour.getKeyPoints().size() + 1);

        tour.getKeyPoints().add(keyPoint);
        tour.setDistanceInKm(calculateTourDistanceInKm(tour.getKeyPoints()));
        tour.setUpdatedAt(Instant.now());

        Tour savedTour = tourRepository.save(tour);
        return toResponse(savedTour);
    }

    public TourResponse updateKeyPoint(String tourId, String keyPointId, UpdateKeyPointRequest request, CurrentUser currentUser) {
        Tour tour = findOwnedTour(tourId, currentUser);
        ensureDraftTour(tour, "key points can be edited only while tour is in draft");
        KeyPoint keyPoint = findKeyPoint(tour, keyPointId);

        keyPoint.setName(request.getName().trim());
        keyPoint.setDescription(request.getDescription().trim());
        keyPoint.setImage(normalizeImage(request.getImage()));
        keyPoint.setLatitude(request.getLatitude());
        keyPoint.setLongitude(request.getLongitude());
        tour.setDistanceInKm(calculateTourDistanceInKm(tour.getKeyPoints()));
        tour.setUpdatedAt(Instant.now());

        Tour savedTour = tourRepository.save(tour);
        return toResponse(savedTour);
    }

    public TourResponse deleteKeyPoint(String tourId, String keyPointId, CurrentUser currentUser) {
        Tour tour = findOwnedTour(tourId, currentUser);
        ensureDraftTour(tour, "key points can be deleted only while tour is in draft");
        KeyPoint keyPoint = findKeyPoint(tour, keyPointId);

        tour.getKeyPoints().remove(keyPoint);
        reindexKeyPoints(tour);
        tour.setDistanceInKm(calculateTourDistanceInKm(tour.getKeyPoints()));
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

    private void ensureDraftTour(Tour tour, String message) {
        if (tour.getStatus() != TourStatus.DRAFT) {
            throw new ApiException(HttpStatus.BAD_REQUEST, message);
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

    public TourResponse updateTourDurations(
        String tourId,
        UpdateTourDurationsRequest request,
        CurrentUser currentUser
    ) {
        Tour tour = findOwnedTour(tourId, currentUser);
        ensureDraftTour(tour, "durations can be updated only while tour is in draft");
        tour.setDurations(normalizeDurations(request.getDurations()));
        tour.setUpdatedAt(Instant.now());
        Tour savedTour = tourRepository.save(tour);
        return toResponse(savedTour);
    }

    public TourResponse updateTour(String tourId, UpdateTourRequest request, CurrentUser currentUser) {
        Tour tour = findOwnedTour(tourId, currentUser);
        ensureDraftTour(tour, "tour basic data can be edited only while tour is in draft");

        tour.setName(request.getName().trim());
        tour.setDescription(request.getDescription().trim());
        tour.setDifficulty(request.getDifficulty());
        tour.setTags(request.getTags().stream().map(String::trim).filter(tag -> !tag.isEmpty()).distinct().toList());
        if (tour.getTags().isEmpty()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "at least one tag is required");
        }
        tour.setPrice(request.getPrice());
        tour.setUpdatedAt(Instant.now());

        Tour savedTour = tourRepository.save(tour);
        return toResponse(savedTour);
    }

    private void validatePublishRequirements(Tour tour) {
        if (tour.getName() == null || tour.getName().trim().isEmpty()
            || tour.getDescription() == null || tour.getDescription().trim().isEmpty()
            || tour.getDifficulty() == null
            || tour.getTags() == null || tour.getTags().isEmpty()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "tour must contain basic data");
        }

        if (tour.getKeyPoints() == null || tour.getKeyPoints().size() < 2) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "tour must contain at least two key points");
        }

        if (tour.getDurations() == null || tour.getDurations().isEmpty()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "at least one duration by transport type is required");
        }
    }

    private void validateToursAvailableForPurchase(List<String> tourIds) {
        List<Tour> tours = tourRepository.findAllById(tourIds);
        if (tours.size() != tourIds.size()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "one or more tours no longer exist");
        }

        Map<String, Tour> toursById = tours.stream()
            .collect(Collectors.toMap(Tour::getId, Function.identity()));

        for (String tourId : tourIds) {
            Tour tour = toursById.get(tourId);
            if (tour == null || tour.getStatus() != TourStatus.PUBLISHED) {
                throw new ApiException(HttpStatus.BAD_REQUEST, "one or more tours are no longer available for purchase");
            }
        }
    }

    private String normalizeTouristId(String touristId) {
        touristId = touristId == null ? "" : touristId.trim();
        if (touristId.isEmpty()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "touristId is required");
        }
        return touristId;
    }

    private List<String> normalizeTourIds(List<String> tourIds) {
        if (tourIds == null || tourIds.isEmpty()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "tourIds are required");
        }

        List<String> normalizedTourIds = tourIds.stream()
            .map(tourId -> tourId == null ? "" : tourId.trim())
            .filter(tourId -> !tourId.isEmpty())
            .distinct()
            .toList();

        if (normalizedTourIds.isEmpty()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "tourIds are required");
        }

        return normalizedTourIds;
    }

    private List<TourDuration> normalizeDurations(List<com.soa.tours.dto.TourDurationRequest> requestDurations) {
        if (requestDurations == null || requestDurations.isEmpty()) {
            return List.of();
        }

        Map<TransportType, TourDuration> deduplicated = requestDurations.stream()
            .filter(item -> item != null && item.getTransportType() != null && item.getMinutes() > 0)
            .map(item -> {
                TourDuration duration = new TourDuration();
                duration.setTransportType(item.getTransportType());
                duration.setMinutes(item.getMinutes());
                return duration;
            })
            .collect(Collectors.toMap(
                TourDuration::getTransportType,
                Function.identity(),
                (first, second) -> second
            ));

        return new ArrayList<>(deduplicated.values());
    }

    private double calculateTourDistanceInKm(List<KeyPoint> keyPoints) {
        if (keyPoints == null || keyPoints.size() < 2) {
            return 0D;
        }

        List<KeyPoint> ordered = keyPoints.stream()
            .sorted((left, right) -> Integer.compare(left.getOrder(), right.getOrder()))
            .toList();

        double total = 0D;
        for (int index = 1; index < ordered.size(); index++) {
            KeyPoint previous = ordered.get(index - 1);
            KeyPoint current = ordered.get(index);
            total += haversineKm(
                previous.getLatitude(),
                previous.getLongitude(),
                current.getLatitude(),
                current.getLongitude()
            );
        }

        return BigDecimal.valueOf(total).setScale(3, RoundingMode.HALF_UP).doubleValue();
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
        return earthRadiusKm * c;
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
        List<KeyPointResponse> keyPoints = tour.getKeyPoints() == null
            ? List.of()
            : tour.getKeyPoints().stream().map(this::toKeyPointResponse).toList();
        int keyPointCount = keyPoints.size();
        List<String> tags = tour.getTags() == null ? List.of() : List.copyOf(tour.getTags());
        List<TourDurationResponse> durations = tour.getDurations() == null
            ? List.of()
            : tour.getDurations().stream().map(this::toDurationResponse).toList();

        return new TourResponse(
            tour.getId(),
            tour.getAuthorId(),
            tour.getAuthorUsername(),
            tour.getName(),
            tour.getDescription(),
            tour.getDifficulty() == null ? "" : tour.getDifficulty().getValue(),
            tags,
            keyPoints,
            keyPointCount,
            durations,
            tour.getStatus() == null ? TourStatus.DRAFT.getValue() : tour.getStatus().getValue(),
            tour.getDistanceInKm(),
            tour.getPrice(),
            false,
            tour.getPublishedAt(),
            tour.getArchivedAt(),
            tour.getCreatedAt(),
            tour.getUpdatedAt()
        );
    }

    private TourResponse toTouristResponse(Tour tour, boolean purchasedByCurrentUser) {
        List<KeyPoint> keyPoints = tour.getKeyPoints() == null ? List.of() : tour.getKeyPoints();
        int keyPointCount = keyPoints.size();
        List<KeyPointResponse> visibleKeyPoints = keyPoints.stream()
            .sorted((left, right) -> Integer.compare(left.getOrder(), right.getOrder()))
            .limit(purchasedByCurrentUser ? keyPoints.size() : 1L)
            .map(this::toKeyPointResponse)
            .toList();
        List<TourDurationResponse> durations = tour.getDurations() == null
            ? List.of()
            : tour.getDurations().stream().map(this::toDurationResponse).toList();
        List<String> tags = tour.getTags() == null ? List.of() : List.copyOf(tour.getTags());

        return new TourResponse(
            tour.getId(),
            tour.getAuthorId(),
            tour.getAuthorUsername(),
            tour.getName(),
            tour.getDescription(),
            tour.getDifficulty() == null ? "" : tour.getDifficulty().getValue(),
            tags,
            visibleKeyPoints,
            keyPointCount,
            durations,
            tour.getStatus() == null ? TourStatus.DRAFT.getValue() : tour.getStatus().getValue(),
            tour.getDistanceInKm(),
            tour.getPrice(),
            purchasedByCurrentUser,
            tour.getPublishedAt(),
            tour.getArchivedAt(),
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

    private TourDurationResponse toDurationResponse(TourDuration tourDuration) {
        return new TourDurationResponse(
            tourDuration.getTransportType().getValue(),
            tourDuration.getMinutes()
        );
    }
}
