package com.soa.tours.dto;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

public class TourResponse {

    private String id;
    private String authorId;
    private String authorUsername;
    private String name;
    private String description;
    private String difficulty;
    private List<String> tags;
    private List<KeyPointResponse> keyPoints;
    private int keyPointCount;
    private List<TourDurationResponse> durations;
    private String status;
    private double distanceInKm;
    private BigDecimal price;
    private boolean purchasedByCurrentUser;
    private Instant publishedAt;
    private Instant archivedAt;
    private Instant createdAt;
    private Instant updatedAt;

    public TourResponse() {
    }

    public TourResponse(
        String id,
        String authorId,
        String authorUsername,
        String name,
        String description,
        String difficulty,
        List<String> tags,
        List<KeyPointResponse> keyPoints,
        int keyPointCount,
        List<TourDurationResponse> durations,
        String status,
        double distanceInKm,
        BigDecimal price,
        boolean purchasedByCurrentUser,
        Instant publishedAt,
        Instant archivedAt,
        Instant createdAt,
        Instant updatedAt
    ) {
        this.id = id;
        this.authorId = authorId;
        this.authorUsername = authorUsername;
        this.name = name;
        this.description = description;
        this.difficulty = difficulty;
        this.tags = tags;
        this.keyPoints = keyPoints;
        this.keyPointCount = keyPointCount;
        this.durations = durations;
        this.status = status;
        this.distanceInKm = distanceInKm;
        this.price = price;
        this.purchasedByCurrentUser = purchasedByCurrentUser;
        this.publishedAt = publishedAt;
        this.archivedAt = archivedAt;
        this.createdAt = createdAt;
        this.updatedAt = updatedAt;
    }

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getAuthorId() {
        return authorId;
    }

    public void setAuthorId(String authorId) {
        this.authorId = authorId;
    }

    public String getAuthorUsername() {
        return authorUsername;
    }

    public void setAuthorUsername(String authorUsername) {
        this.authorUsername = authorUsername;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public String getDifficulty() {
        return difficulty;
    }

    public void setDifficulty(String difficulty) {
        this.difficulty = difficulty;
    }

    public List<String> getTags() {
        return tags;
    }

    public void setTags(List<String> tags) {
        this.tags = tags;
    }

    public List<KeyPointResponse> getKeyPoints() {
        return keyPoints;
    }

    public void setKeyPoints(List<KeyPointResponse> keyPoints) {
        this.keyPoints = keyPoints;
    }

    public int getKeyPointCount() {
        return keyPointCount;
    }

    public void setKeyPointCount(int keyPointCount) {
        this.keyPointCount = keyPointCount;
    }

    public List<TourDurationResponse> getDurations() {
        return durations;
    }

    public void setDurations(List<TourDurationResponse> durations) {
        this.durations = durations;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public double getDistanceInKm() {
        return distanceInKm;
    }

    public void setDistanceInKm(double distanceInKm) {
        this.distanceInKm = distanceInKm;
    }

    public BigDecimal getPrice() {
        return price;
    }

    public void setPrice(BigDecimal price) {
        this.price = price;
    }

    public boolean isPurchasedByCurrentUser() {
        return purchasedByCurrentUser;
    }

    public void setPurchasedByCurrentUser(boolean purchasedByCurrentUser) {
        this.purchasedByCurrentUser = purchasedByCurrentUser;
    }

    public Instant getPublishedAt() {
        return publishedAt;
    }

    public void setPublishedAt(Instant publishedAt) {
        this.publishedAt = publishedAt;
    }

    public Instant getArchivedAt() {
        return archivedAt;
    }

    public void setArchivedAt(Instant archivedAt) {
        this.archivedAt = archivedAt;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(Instant createdAt) {
        this.createdAt = createdAt;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(Instant updatedAt) {
        this.updatedAt = updatedAt;
    }
}
