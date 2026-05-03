package com.soa.tours.dto;

import java.time.Instant;

public class TouristPositionResponse {

    private String id;
    private String touristId;
    private String touristUsername;
    private double latitude;
    private double longitude;
    private Instant updatedAt;

    public TouristPositionResponse(
        String id,
        String touristId,
        String touristUsername,
        double latitude,
        double longitude,
        Instant updatedAt
    ) {
        this.id = id;
        this.touristId = touristId;
        this.touristUsername = touristUsername;
        this.latitude = latitude;
        this.longitude = longitude;
        this.updatedAt = updatedAt;
    }

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getTouristId() {
        return touristId;
    }

    public void setTouristId(String touristId) {
        this.touristId = touristId;
    }

    public String getTouristUsername() {
        return touristUsername;
    }

    public void setTouristUsername(String touristUsername) {
        this.touristUsername = touristUsername;
    }

    public double getLatitude() {
        return latitude;
    }

    public void setLatitude(double latitude) {
        this.latitude = latitude;
    }

    public double getLongitude() {
        return longitude;
    }

    public void setLongitude(double longitude) {
        this.longitude = longitude;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(Instant updatedAt) {
        this.updatedAt = updatedAt;
    }
}
