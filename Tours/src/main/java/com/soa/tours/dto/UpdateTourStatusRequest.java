package com.soa.tours.dto;

import com.soa.tours.model.TourStatus;

import jakarta.validation.constraints.NotNull;

public class UpdateTourStatusRequest {

    @NotNull(message = "status is required")
    private TourStatus status;

    public TourStatus getStatus() {
        return status;
    }

    public void setStatus(TourStatus status) {
        this.status = status;
    }
}
