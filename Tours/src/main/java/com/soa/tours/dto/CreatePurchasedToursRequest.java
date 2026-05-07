package com.soa.tours.dto;

import java.util.List;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;

public class CreatePurchasedToursRequest {

    @NotBlank(message = "touristId is required")
    private String touristId;

    @NotEmpty(message = "tourIds are required")
    private List<String> tourIds;

    public String getTouristId() {
        return touristId;
    }

    public void setTouristId(String touristId) {
        this.touristId = touristId;
    }

    public List<String> getTourIds() {
        return tourIds;
    }

    public void setTourIds(List<String> tourIds) {
        this.tourIds = tourIds;
    }
}
