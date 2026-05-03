package com.soa.tours.model;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;

public enum TourDifficulty {
    EASY("easy"),
    MEDIUM("medium"),
    ADVANCED("advanced"),
    HARD("hard");

    private final String value;

    TourDifficulty(String value) {
        this.value = value;
    }

    @JsonValue
    public String getValue() {
        return value;
    }

    @JsonCreator
    public static TourDifficulty fromValue(String value) {
        if (value == null) {
            return null;
        }

        for (TourDifficulty difficulty : values()) {
            if (difficulty.value.equalsIgnoreCase(value.trim())) {
                return difficulty;
            }
        }

        throw new IllegalArgumentException("difficulty must be one of: easy, medium, advanced, hard");
    }
}
