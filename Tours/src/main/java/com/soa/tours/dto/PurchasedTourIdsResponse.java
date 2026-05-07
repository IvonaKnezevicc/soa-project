package com.soa.tours.dto;

import java.util.List;

public class PurchasedTourIdsResponse {

    private String touristId;
    private List<String> tourIds;

    public PurchasedTourIdsResponse(String touristId, List<String> tourIds) {
        this.touristId = touristId;
        this.tourIds = tourIds;
    }

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
