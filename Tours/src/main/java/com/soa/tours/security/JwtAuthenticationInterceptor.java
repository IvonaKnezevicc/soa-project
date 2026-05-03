package com.soa.tours.security;

import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;

import com.soa.tours.exception.ApiException;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

import org.springframework.http.HttpStatus;

@Component
public class JwtAuthenticationInterceptor implements HandlerInterceptor {

    public static final String CURRENT_USER_ATTRIBUTE = "currentUser";

    private final JwtService jwtService;

    public JwtAuthenticationInterceptor(JwtService jwtService) {
        this.jwtService = jwtService;
    }

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) {
        String authHeader = request.getHeader("Authorization");
        if (authHeader == null || authHeader.trim().isEmpty()) {
            throw new ApiException(HttpStatus.UNAUTHORIZED, "authorization header is required");
        }

        String trimmed = authHeader.trim();
        if (!trimmed.startsWith("Bearer ")) {
            throw new ApiException(HttpStatus.UNAUTHORIZED, "bearer token is required");
        }

        String token = trimmed.substring("Bearer ".length()).trim();
        if (token.isEmpty()) {
            throw new ApiException(HttpStatus.UNAUTHORIZED, "bearer token is required");
        }

        CurrentUser currentUser = jwtService.validateToken(token);
        request.setAttribute(CURRENT_USER_ATTRIBUTE, currentUser);
        return true;
    }
}
