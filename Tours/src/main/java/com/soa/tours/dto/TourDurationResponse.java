package com.soa.tours.dto;

public class TourDurationResponse {

    private String transportType;
    private int minutes;

    public TourDurationResponse() {
    }

    public TourDurationResponse(String transportType, int minutes) {
        this.transportType = transportType;
        this.minutes = minutes;
    }

    public String getTransportType() {
        return transportType;
    }

    public void setTransportType(String transportType) {
        this.transportType = transportType;
    }

    public int getMinutes() {
        return minutes;
    }

    public void setMinutes(int minutes) {
        this.minutes = minutes;
    }
}
