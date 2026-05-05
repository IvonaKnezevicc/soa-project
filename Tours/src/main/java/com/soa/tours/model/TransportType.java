package com.soa.tours.model;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;

public enum TransportType {
    WALKING("walking"),
    BICYCLE("bicycle"),
    CAR("car");

    private final String value;

    TransportType(String value) {
        this.value = value;
    }

    @JsonValue
    public String getValue() {
        return value;
    }

    @JsonCreator
    public static TransportType fromValue(String value) {
        if (value == null) {
            return null;
        }

        for (TransportType transportType : values()) {
            if (transportType.value.equalsIgnoreCase(value.trim())) {
                return transportType;
            }
        }

        throw new IllegalArgumentException("transport type must be one of: walking, bicycle, car");
    }
}
