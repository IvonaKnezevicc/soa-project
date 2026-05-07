package com.soa.tours.dto;

import java.time.Instant;
import java.util.List;

public class TourExecutionResponse {

    private String id;
    private String touristId;
    private String touristUsername;
    private String tourId;
    private String tourName;
    private String status;
    private Instant startedAt;
    private Instant completedAt;
    private Instant abandonedAt;
    private Instant lastActivityAt;
    private double startedLatitude;
    private double startedLongitude;
    private List<CompletedKeyPointResponse> completedKeyPoints;

    public TourExecutionResponse() {
    }

    public TourExecutionResponse(
        String id,
        String touristId,
        String touristUsername,
        String tourId,
        String tourName,
        String status,
        Instant startedAt,
        Instant completedAt,
        Instant abandonedAt,
        Instant lastActivityAt,
        double startedLatitude,
        double startedLongitude,
        List<CompletedKeyPointResponse> completedKeyPoints
    ) {
        this.id = id;
        this.touristId = touristId;
        this.touristUsername = touristUsername;
        this.tourId = tourId;
        this.tourName = tourName;
        this.status = status;
        this.startedAt = startedAt;
        this.completedAt = completedAt;
        this.abandonedAt = abandonedAt;
        this.lastActivityAt = lastActivityAt;
        this.startedLatitude = startedLatitude;
        this.startedLongitude = startedLongitude;
        this.completedKeyPoints = completedKeyPoints;
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

    public String getTourId() {
        return tourId;
    }

    public void setTourId(String tourId) {
        this.tourId = tourId;
    }

    public String getTourName() {
        return tourName;
    }

    public void setTourName(String tourName) {
        this.tourName = tourName;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public Instant getStartedAt() {
        return startedAt;
    }

    public void setStartedAt(Instant startedAt) {
        this.startedAt = startedAt;
    }

    public Instant getCompletedAt() {
        return completedAt;
    }

    public void setCompletedAt(Instant completedAt) {
        this.completedAt = completedAt;
    }

    public Instant getAbandonedAt() {
        return abandonedAt;
    }

    public void setAbandonedAt(Instant abandonedAt) {
        this.abandonedAt = abandonedAt;
    }

    public Instant getLastActivityAt() {
        return lastActivityAt;
    }

    public void setLastActivityAt(Instant lastActivityAt) {
        this.lastActivityAt = lastActivityAt;
    }

    public double getStartedLatitude() {
        return startedLatitude;
    }

    public void setStartedLatitude(double startedLatitude) {
        this.startedLatitude = startedLatitude;
    }

    public double getStartedLongitude() {
        return startedLongitude;
    }

    public void setStartedLongitude(double startedLongitude) {
        this.startedLongitude = startedLongitude;
    }

    public List<CompletedKeyPointResponse> getCompletedKeyPoints() {
        return completedKeyPoints;
    }

    public void setCompletedKeyPoints(List<CompletedKeyPointResponse> completedKeyPoints) {
        this.completedKeyPoints = completedKeyPoints;
    }
}
