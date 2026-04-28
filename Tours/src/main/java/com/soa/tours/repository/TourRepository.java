package com.soa.tours.repository;

import java.util.List;

import org.springframework.data.mongodb.repository.MongoRepository;

import com.soa.tours.model.Tour;

public interface TourRepository extends MongoRepository<Tour, String> {

    List<Tour> findByAuthorUsernameOrderByCreatedAtDesc(String authorUsername);
}
