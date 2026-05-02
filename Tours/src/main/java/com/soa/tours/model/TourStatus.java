package com.soa.tours.model;

import com.fasterxml.jackson.annotation.JsonCreator;
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

    @JsonCreator
    public static TourStatus fromValue(String value) {
        if (value == null) {
            return null;
        }

        for (TourStatus status : values()) {
            if (status.value.equalsIgnoreCase(value.trim())) {
                return status;
            }
        }

        throw new IllegalArgumentException("status must be one of: draft, published, archived");
    }
}
