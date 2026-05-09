package com.soa.tours.dto;

import java.time.Instant;

public class CompletedKeyPointResponse {

    private String keyPointId;
    private String keyPointName;
    private int order;
    private double latitude;
    private double longitude;
    private Instant reachedAt;

    public CompletedKeyPointResponse() {
    }

    public CompletedKeyPointResponse(
        String keyPointId,
        String keyPointName,
        int order,
        double latitude,
        double longitude,
        Instant reachedAt
    ) {
        this.keyPointId = keyPointId;
        this.keyPointName = keyPointName;
        this.order = order;
        this.latitude = latitude;
        this.longitude = longitude;
        this.reachedAt = reachedAt;
    }

    public String getKeyPointId() {
        return keyPointId;
    }

    public void setKeyPointId(String keyPointId) {
        this.keyPointId = keyPointId;
    }

    public String getKeyPointName() {
        return keyPointName;
    }

    public void setKeyPointName(String keyPointName) {
        this.keyPointName = keyPointName;
    }

    public int getOrder() {
        return order;
    }

    public void setOrder(int order) {
        this.order = order;
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

    public Instant getReachedAt() {
        return reachedAt;
    }

    public void setReachedAt(Instant reachedAt) {
        this.reachedAt = reachedAt;
    }
}
