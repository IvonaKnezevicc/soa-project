package middleware

import (
	"net/http"

	"soa-project/stakeholders/internal/auth"
)

type RoleMiddleware struct{}

func NewRoleMiddleware() *RoleMiddleware {
	return &RoleMiddleware{}
}

func (m *RoleMiddleware) RequireRole(role string, next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		identity, ok := auth.IdentityFromContext(r.Context())
		if !ok {
			writeError(w, http.StatusUnauthorized, "authenticated user not found in context")
			return
		}

		if identity.Role != role {
			writeError(w, http.StatusForbidden, "forbidden")
			return
		}

		next(w, r)
	}
}
