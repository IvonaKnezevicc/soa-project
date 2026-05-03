package com.soa.tours.repository;

import java.util.Optional;

import org.springframework.data.mongodb.repository.MongoRepository;

import com.soa.tours.model.TouristPosition;

public interface TouristPositionRepository extends MongoRepository<TouristPosition, String> {

    Optional<TouristPosition> findByTouristUsername(String touristUsername);
}
