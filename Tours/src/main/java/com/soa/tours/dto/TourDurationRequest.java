package com.soa.tours.dto;

import com.soa.tours.model.TransportType;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

public class TourDurationRequest {

    @NotNull(message = "transportType is required")
    private TransportType transportType;

    @Min(value = 1, message = "minutes must be greater than 0")
    private int minutes;

    public TransportType getTransportType() {
        return transportType;
    }

    public void setTransportType(TransportType transportType) {
        this.transportType = transportType;
    }

    public int getMinutes() {
        return minutes;
    }

    public void setMinutes(int minutes) {
        this.minutes = minutes;
    }
}
