package com.soa.tours.dto;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

public class TourReviewResponse {

    private String id;
    private String tourId;
    private String tourName;
    private String touristId;
    private String touristUsername;
    private int rating;
    private String comment;
    private LocalDate visitedAt;
    private Instant createdAt;
    private List<String> images;

    public TourReviewResponse(
        String id,
        String tourId,
        String tourName,
        String touristId,
        String touristUsername,
        int rating,
        String comment,
        LocalDate visitedAt,
        Instant createdAt,
        List<String> images
    ) {
        this.id = id;
        this.tourId = tourId;
        this.tourName = tourName;
        this.touristId = touristId;
        this.touristUsername = touristUsername;
        this.rating = rating;
        this.comment = comment;
        this.visitedAt = visitedAt;
        this.createdAt = createdAt;
        this.images = images;
    }

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
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

    public int getRating() {
        return rating;
    }

    public void setRating(int rating) {
        this.rating = rating;
    }

    public String getComment() {
        return comment;
    }

    public void setComment(String comment) {
        this.comment = comment;
    }

    public LocalDate getVisitedAt() {
        return visitedAt;
    }

    public void setVisitedAt(LocalDate visitedAt) {
        this.visitedAt = visitedAt;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(Instant createdAt) {
        this.createdAt = createdAt;
    }

    public List<String> getImages() {
        return images;
    }

    public void setImages(List<String> images) {
        this.images = images;
    }
}
