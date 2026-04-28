package com.soa.tours.dto;

public class KeyPointResponse {

    private String id;
    private String name;
    private String description;
    private String image;
    private double latitude;
    private double longitude;
    private int order;

    public KeyPointResponse() {
    }

    public KeyPointResponse(
        String id,
        String name,
        String description,
        String image,
        double latitude,
        double longitude,
        int order
    ) {
        this.id = id;
        this.name = name;
        this.description = description;
        this.image = image;
        this.latitude = latitude;
        this.longitude = longitude;
        this.order = order;
    }

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
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

    public String getImage() {
        return image;
    }

    public void setImage(String image) {
        this.image = image;
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

    public int getOrder() {
        return order;
    }

    public void setOrder(int order) {
        this.order = order;
    }
}
