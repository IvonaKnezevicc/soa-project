package com.soa.tours.model;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;

public enum TourExecutionStatus {
    ACTIVE("active"),
    COMPLETED("completed"),
    ABANDONED("abandoned");

    private final String value;

    TourExecutionStatus(String value) {
        this.value = value;
    }

    @JsonValue
    public String getValue() {
        return value;
    }

    @JsonCreator
    public static TourExecutionStatus fromValue(String value) {
        if (value == null) {
            return null;
        }

        for (TourExecutionStatus status : values()) {
            if (status.value.equalsIgnoreCase(value.trim())) {
                return status;
            }
        }

        throw new IllegalArgumentException("status must be one of: active, completed, abandoned");
    }
}
