package com.soa.tours.controller;

import java.util.List;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestAttribute;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.soa.tours.dto.TourExecutionResponse;
import com.soa.tours.security.CurrentUser;
import com.soa.tours.security.JwtAuthenticationInterceptor;
import com.soa.tours.service.TourExecutionService;

@RestController
@RequestMapping("/api/tours")
public class TourExecutionController {

    private final TourExecutionService tourExecutionService;

    public TourExecutionController(TourExecutionService tourExecutionService) {
        this.tourExecutionService = tourExecutionService;
    }

    @PostMapping("/{tourId}/executions/start")
    public TourExecutionResponse startTourExecution(
        @PathVariable String tourId,
        @RequestAttribute(JwtAuthenticationInterceptor.CURRENT_USER_ATTRIBUTE) CurrentUser currentUser
    ) {
        return tourExecutionService.startTourExecution(tourId, currentUser);
    }

    @GetMapping("/executions/active")
    public TourExecutionResponse getActiveExecution(
        @RequestAttribute(JwtAuthenticationInterceptor.CURRENT_USER_ATTRIBUTE) CurrentUser currentUser
    ) {
        return tourExecutionService.getActiveExecution(currentUser);
    }

    @GetMapping("/executions/my")
    public List<TourExecutionResponse> getMyExecutions(
        @RequestAttribute(JwtAuthenticationInterceptor.CURRENT_USER_ATTRIBUTE) CurrentUser currentUser
    ) {
        return tourExecutionService.getMyExecutions(currentUser);
    }

    @PostMapping("/executions/{executionId}/check-progress")
    public TourExecutionResponse checkExecutionProgress(
        @PathVariable String executionId,
        @RequestAttribute(JwtAuthenticationInterceptor.CURRENT_USER_ATTRIBUTE) CurrentUser currentUser
    ) {
        return tourExecutionService.checkExecutionProgress(executionId, currentUser);
    }

    @PostMapping("/executions/{executionId}/complete")
    public TourExecutionResponse completeExecution(
        @PathVariable String executionId,
        @RequestAttribute(JwtAuthenticationInterceptor.CURRENT_USER_ATTRIBUTE) CurrentUser currentUser
    ) {
        return tourExecutionService.completeExecution(executionId, currentUser);
    }

    @PostMapping("/executions/{executionId}/abandon")
    public TourExecutionResponse abandonExecution(
        @PathVariable String executionId,
        @RequestAttribute(JwtAuthenticationInterceptor.CURRENT_USER_ATTRIBUTE) CurrentUser currentUser
    ) {
        return tourExecutionService.abandonExecution(executionId, currentUser);
    }
}
