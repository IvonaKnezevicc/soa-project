package middleware

import (
	"encoding/json"
	"errors"
	"net/http"
	"strings"

	"soa-project/stakeholders/internal/apperror"
	"soa-project/stakeholders/internal/auth"
	"soa-project/stakeholders/internal/dto"
	"soa-project/stakeholders/internal/service"
)

type AuthMiddleware struct {
	jwtService service.JWTService
}

func NewAuthMiddleware(jwtService service.JWTService) *AuthMiddleware {
	return &AuthMiddleware{jwtService: jwtService}
}

func (m *AuthMiddleware) RequireAuth(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		authHeader := strings.TrimSpace(r.Header.Get("Authorization"))
		if authHeader == "" {
			writeError(w, http.StatusUnauthorized, "authorization header is required")
			return
		}

		token := strings.TrimSpace(strings.TrimPrefix(authHeader, "Bearer "))
		if token == authHeader || token == "" {
			writeError(w, http.StatusUnauthorized, "bearer token is required")
			return
		}

		identity, err := m.jwtService.ValidateToken(token)
		if err != nil {
			if errors.Is(err, apperror.ErrUnauthorized) {
				writeError(w, http.StatusUnauthorized, err.Error())
				return
			}

			writeError(w, http.StatusUnauthorized, "invalid or expired token")
			return
		}

		next(w, r.WithContext(auth.WithIdentity(r.Context(), identity)))
	}
}

func writeError(w http.ResponseWriter, status int, message string) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = jsonResponse(w, dto.ErrorResponse{Message: message})
}

func jsonResponse(w http.ResponseWriter, payload any) error {
	return json.NewEncoder(w).Encode(payload)
}
