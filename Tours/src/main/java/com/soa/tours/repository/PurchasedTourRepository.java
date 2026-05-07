package com.soa.tours.repository;

import java.util.Collection;
import java.util.List;

import org.springframework.data.mongodb.repository.MongoRepository;

import com.soa.tours.model.PurchasedTour;

public interface PurchasedTourRepository extends MongoRepository<PurchasedTour, String> {

    List<PurchasedTour> findByTouristId(String touristId);

    List<PurchasedTour> findByTouristIdAndTourIdIn(String touristId, Collection<String> tourIds);

    void deleteByTouristIdAndTourIdIn(String touristId, Collection<String> tourIds);
}
