package com.soa.tours.service;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

import com.soa.tours.dto.CreateKeyPointRequest;
import com.soa.tours.dto.CreateTourRequest;
import com.soa.tours.dto.KeyPointResponse;
import com.soa.tours.dto.TourResponse;
import com.soa.tours.dto.UpdateKeyPointRequest;
import com.soa.tours.exception.ApiException;
import com.soa.tours.model.KeyPoint;
import com.soa.tours.model.Tour;
import com.soa.tours.model.TourStatus;
import com.soa.tours.repository.TourRepository;
import com.soa.tours.security.CurrentUser;

@Service
public class TourService {

    private final TourRepository tourRepository;

    public TourService(TourRepository tourRepository) {
        this.tourRepository = tourRepository;
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

    public TourResponse getTourById(String tourId, CurrentUser currentUser) {
        Tour tour = findOwnedTour(tourId, currentUser);
        return toResponse(tour);
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
