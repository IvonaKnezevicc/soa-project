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
    private String status;
    private BigDecimal price;
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
        String status,
        BigDecimal price,
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
        this.status = status;
        this.price = price;
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

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public BigDecimal getPrice() {
        return price;
    }

    public void setPrice(BigDecimal price) {
        this.price = price;
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
