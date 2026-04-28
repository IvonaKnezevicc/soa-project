package com.soa.tours.security;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

import com.auth0.jwt.JWT;
import com.auth0.jwt.algorithms.Algorithm;
import com.auth0.jwt.exceptions.JWTVerificationException;
import com.auth0.jwt.interfaces.DecodedJWT;
import com.auth0.jwt.interfaces.JWTVerifier;
import com.soa.tours.exception.ApiException;

@Service
public class JwtService {

    private final JWTVerifier verifier;

    public JwtService(
        @Value("${jwt.secret}") String secret,
        @Value("${jwt.issuer}") String issuer
    ) {
        this.verifier = JWT.require(Algorithm.HMAC256(secret))
            .withIssuer(issuer)
            .build();
    }

    public CurrentUser validateToken(String token) {
        final DecodedJWT jwt;
        try {
            jwt = verifier.verify(token);
        } catch (JWTVerificationException ex) {
            throw new ApiException(HttpStatus.UNAUTHORIZED, "invalid or expired token");
        }

        String userId = jwt.getSubject();
        String username = jwt.getClaim("username").asString();
        String email = jwt.getClaim("email").asString();
        String role = jwt.getClaim("role").asString();

        if (isBlank(userId) || isBlank(username) || isBlank(role)) {
            throw new ApiException(HttpStatus.UNAUTHORIZED, "invalid or expired token");
        }

        return new CurrentUser(userId, username, email, role);
    }

    private boolean isBlank(String value) {
        return value == null || value.trim().isEmpty();
    }
}
