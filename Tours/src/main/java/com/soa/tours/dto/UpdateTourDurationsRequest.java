package com.soa.tours.dto;

import java.util.List;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public class UpdateTourDurationsRequest {

    @NotNull(message = "durations are required")
    @NotEmpty(message = "at least one duration is required")
    @Size(max = 3, message = "at most three durations are allowed")
    private List<@Valid @NotNull(message = "duration item is required") TourDurationRequest> durations;

    public List<TourDurationRequest> getDurations() {
        return durations;
    }

    public void setDurations(List<TourDurationRequest> durations) {
        this.durations = durations;
    }
}
