package com.soa.tours.model;

import com.fasterxml.jackson.annotation.JsonValue;

public enum TourStatus {
    DRAFT("draft"),
    PUBLISHED("published"),
    ARCHIVED("archived");

    private final String value;

    TourStatus(String value) {
        this.value = value;
    }

    @JsonValue
    public String getValue() {
        return value;
    }
}
