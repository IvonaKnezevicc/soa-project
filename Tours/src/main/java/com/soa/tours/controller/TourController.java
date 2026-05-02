package com.soa.tours.controller;

import java.util.List;

import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestAttribute;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.soa.tours.dto.CreateKeyPointRequest;
import com.soa.tours.dto.CreateTourRequest;
import com.soa.tours.dto.TourResponse;
import com.soa.tours.dto.TouristPositionResponse;
import com.soa.tours.dto.UpdateKeyPointRequest;
import com.soa.tours.dto.UpdateTourStatusRequest;
import com.soa.tours.dto.UpdateTouristPositionRequest;
import com.soa.tours.security.CurrentUser;
import com.soa.tours.security.JwtAuthenticationInterceptor;
import com.soa.tours.service.TourService;

import jakarta.validation.Valid;

@Validated
@RestController
@RequestMapping("/api/tours")
public class TourController {

    private final TourService tourService;

    public TourController(TourService tourService) {
        this.tourService = tourService;
    }

    @PostMapping
    public TourResponse createTour(
        @Valid @RequestBody CreateTourRequest request,
        @RequestAttribute(JwtAuthenticationInterceptor.CURRENT_USER_ATTRIBUTE) CurrentUser currentUser
    ) {
        return tourService.createTour(request, currentUser);
    }

    @GetMapping("/my")
    public List<TourResponse> getMyTours(
        @RequestAttribute(JwtAuthenticationInterceptor.CURRENT_USER_ATTRIBUTE) CurrentUser currentUser
    ) {
        return tourService.getToursForCurrentAuthor(currentUser);
    }

    @GetMapping("/position/me")
    public TouristPositionResponse getMyPosition(
        @RequestAttribute(JwtAuthenticationInterceptor.CURRENT_USER_ATTRIBUTE) CurrentUser currentUser
    ) {
        return tourService.getCurrentTouristPosition(currentUser);
    }

    @PutMapping("/position/me")
    public TouristPositionResponse updateMyPosition(
        @Valid @RequestBody UpdateTouristPositionRequest request,
        @RequestAttribute(JwtAuthenticationInterceptor.CURRENT_USER_ATTRIBUTE) CurrentUser currentUser
    ) {
        return tourService.updateCurrentTouristPosition(request, currentUser);
    }

    @GetMapping("/{tourId}")
    public TourResponse getTourById(
        @PathVariable String tourId,
        @RequestAttribute(JwtAuthenticationInterceptor.CURRENT_USER_ATTRIBUTE) CurrentUser currentUser
    ) {
        return tourService.getTourById(tourId, currentUser);
    }

    @PatchMapping("/{tourId}/status")
    public TourResponse updateTourStatus(
        @PathVariable String tourId,
        @Valid @RequestBody UpdateTourStatusRequest request,
        @RequestAttribute(JwtAuthenticationInterceptor.CURRENT_USER_ATTRIBUTE) CurrentUser currentUser
    ) {
        return tourService.updateTourStatus(tourId, request, currentUser);
    }

    @PostMapping("/{tourId}/key-points")
    public TourResponse addKeyPoint(
        @PathVariable String tourId,
        @Valid @RequestBody CreateKeyPointRequest request,
        @RequestAttribute(JwtAuthenticationInterceptor.CURRENT_USER_ATTRIBUTE) CurrentUser currentUser
    ) {
        return tourService.addKeyPoint(tourId, request, currentUser);
    }

    @PutMapping("/{tourId}/key-points/{keyPointId}")
    public TourResponse updateKeyPoint(
        @PathVariable String tourId,
        @PathVariable String keyPointId,
        @Valid @RequestBody UpdateKeyPointRequest request,
        @RequestAttribute(JwtAuthenticationInterceptor.CURRENT_USER_ATTRIBUTE) CurrentUser currentUser
    ) {
        return tourService.updateKeyPoint(tourId, keyPointId, request, currentUser);
    }

    @DeleteMapping("/{tourId}/key-points/{keyPointId}")
    public TourResponse deleteKeyPoint(
        @PathVariable String tourId,
        @PathVariable String keyPointId,
        @RequestAttribute(JwtAuthenticationInterceptor.CURRENT_USER_ATTRIBUTE) CurrentUser currentUser
    ) {
        return tourService.deleteKeyPoint(tourId, keyPointId, currentUser);
    }
}
