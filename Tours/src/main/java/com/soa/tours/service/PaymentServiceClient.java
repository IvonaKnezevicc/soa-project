package com.soa.tours.service;

import java.util.List;
import java.util.Set;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

@Component
public class PaymentServiceClient {

    private final RestClient restClient;

    public PaymentServiceClient(@Value("${payment.service.url:http://localhost:8084}") String paymentServiceUrl) {
        this.restClient = RestClient.builder()
            .baseUrl(paymentServiceUrl)
            .build();
    }

    public Set<String> getPurchasedTourIdsForTourist(String touristUsername) {
        try {
            PurchasedToursResponse response = restClient.get()
                .uri(uriBuilder -> uriBuilder
                    .path("/api/payment/internal/purchases/by-tourist")
                    .queryParam("touristUsername", touristUsername)
                    .build())
                .retrieve()
                .body(PurchasedToursResponse.class);

            if (response == null || response.tourIds() == null) {
                return Set.of();
            }

            return Set.copyOf(response.tourIds());
        } catch (Exception exception) {
            return Set.of();
        }
    }

    record PurchasedToursResponse(List<String> tourIds) {
    }
}
