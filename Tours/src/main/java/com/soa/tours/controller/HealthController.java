package com.soa.tours.controller;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import com.soa.tours.dto.HealthResponse;

@RestController
public class HealthController {

    @GetMapping("/health")
    public HealthResponse health() {
        return new HealthResponse("tours", "ok");
    }
}
