package com.soa.tours.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.mongodb.repository.MongoRepository;

import com.soa.tours.model.TourExecution;
import com.soa.tours.model.TourExecutionStatus;

public interface TourExecutionRepository extends MongoRepository<TourExecution, String> {

    Optional<TourExecution> findFirstByTouristIdAndStatusOrderByStartedAtDesc(
        String touristId,
        TourExecutionStatus status
    );

    List<TourExecution> findByTouristIdOrderByStartedAtDesc(String touristId);
}
