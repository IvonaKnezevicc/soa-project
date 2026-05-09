package com.soa.tours.model;

import java.time.Instant;

public class CompletedKeyPoint {

    private String keyPointId;
    private String keyPointName;
    private int order;
    private double latitude;
    private double longitude;
    private Instant reachedAt;

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
