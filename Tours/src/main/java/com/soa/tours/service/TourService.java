package com.soa.tours.service;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

import com.soa.tours.dto.CreateTourRequest;
import com.soa.tours.dto.TourResponse;
import com.soa.tours.exception.ApiException;
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

    private TourResponse toResponse(Tour tour) {
        return new TourResponse(
            tour.getId(),
            tour.getAuthorId(),
            tour.getAuthorUsername(),
            tour.getName(),
            tour.getDescription(),
            tour.getDifficulty().getValue(),
            List.copyOf(tour.getTags()),
            tour.getStatus().getValue(),
            tour.getPrice(),
            tour.getCreatedAt(),
            tour.getUpdatedAt()
        );
    }
}
