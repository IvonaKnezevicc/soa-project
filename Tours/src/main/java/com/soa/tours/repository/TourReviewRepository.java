package com.soa.tours.repository;

import java.util.List;

import org.springframework.data.mongodb.repository.MongoRepository;

import com.soa.tours.model.TourReview;

public interface TourReviewRepository extends MongoRepository<TourReview, String> {

    List<TourReview> findByTourIdOrderByCreatedAtDesc(String tourId);

    boolean existsByTourIdAndTouristUsername(String tourId, String touristUsername);
}
