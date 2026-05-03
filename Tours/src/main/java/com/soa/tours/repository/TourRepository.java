package com.soa.tours.repository;

import java.util.List;

import org.springframework.data.mongodb.repository.MongoRepository;

import com.soa.tours.model.Tour;
import com.soa.tours.model.TourStatus;

public interface TourRepository extends MongoRepository<Tour, String> {

    List<Tour> findByAuthorUsernameOrderByCreatedAtDesc(String authorUsername);

    List<Tour> findByStatusOrderByCreatedAtDesc(TourStatus status);
}
