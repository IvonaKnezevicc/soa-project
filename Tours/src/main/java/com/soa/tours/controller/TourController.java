package com.soa.tours.controller;

import java.util.List;

import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestAttribute;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.soa.tours.dto.CreateTourRequest;
import com.soa.tours.dto.TourResponse;
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
}
