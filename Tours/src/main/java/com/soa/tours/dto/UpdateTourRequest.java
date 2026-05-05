package com.soa.tours.dto;

import java.math.BigDecimal;
import java.util.List;

import com.soa.tours.model.TourDifficulty;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public class UpdateTourRequest {

    @NotBlank(message = "name is required")
    @Size(max = 200, message = "name must contain at most 200 characters")
    private String name;

    @NotBlank(message = "description is required")
    @Size(max = 5000, message = "description must contain at most 5000 characters")
    private String description;

    @NotNull(message = "difficulty is required")
    private TourDifficulty difficulty;

    @NotEmpty(message = "at least one tag is required")
    @Size(max = 20, message = "at most 20 tags are allowed")
    private List<@NotBlank(message = "tag must not be blank") @Size(max = 50, message = "tag must contain at most 50 characters") String> tags;

    @NotNull(message = "price is required")
    @DecimalMin(value = "0.00", message = "price must be greater than or equal to 0")
    @Digits(integer = 10, fraction = 2, message = "price can have up to 2 decimal places")
    private BigDecimal price;

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

    public TourDifficulty getDifficulty() {
        return difficulty;
    }

    public void setDifficulty(TourDifficulty difficulty) {
        this.difficulty = difficulty;
    }

    public List<String> getTags() {
        return tags;
    }

    public void setTags(List<String> tags) {
        this.tags = tags;
    }

    public BigDecimal getPrice() {
        return price;
    }

    public void setPrice(BigDecimal price) {
        this.price = price;
    }
}
