package com.soa.tours.model;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.CompoundIndex;
import org.springframework.data.mongodb.core.mapping.Document;

@Document(collection = "tour_executions")
@CompoundIndex(name = "tourist_status_idx", def = "{'touristId': 1, 'status': 1}")
public class TourExecution {

    @Id
    private String id;
    private String touristId;
    private String touristUsername;
    private String tourId;
    private String tourName;
    private TourExecutionStatus status;
    private Instant startedAt;
    private Instant completedAt;
    private Instant abandonedAt;
    private Instant lastActivityAt;
    private double startedLatitude;
    private double startedLongitude;
    private List<CompletedKeyPoint> completedKeyPoints = new ArrayList<>();

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

    public TourExecutionStatus getStatus() {
        return status;
    }

    public void setStatus(TourExecutionStatus status) {
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

    public List<CompletedKeyPoint> getCompletedKeyPoints() {
        return completedKeyPoints;
    }

    public void setCompletedKeyPoints(List<CompletedKeyPoint> completedKeyPoints) {
        this.completedKeyPoints = completedKeyPoints;
    }
}
