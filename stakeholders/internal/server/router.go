package server

import (
	"net/http"

	"soa-project/stakeholders/internal/controller"
	"soa-project/stakeholders/internal/middleware"
)

func NewRouter(
	userController *controller.UserController,
	authMiddleware *middleware.AuthMiddleware,
	roleMiddleware *middleware.RoleMiddleware,
	corsMiddleware *middleware.CORSMiddleware,
) http.Handler {
	mux := http.NewServeMux()
	mux.HandleFunc("/health", userController.Health)
	mux.HandleFunc("/api/stakeholders/users/register", userController.RegisterUser)
	mux.HandleFunc("/api/stakeholders/users/login", userController.LoginUser)
	mux.HandleFunc("/api/stakeholders/users/me", authMiddleware.RequireAuth(userController.GetAuthenticatedUser))
	mux.HandleFunc("/api/stakeholders/users/profile", authMiddleware.RequireAuth(func(w http.ResponseWriter, r *http.Request) {
		switch r.Method {
		case http.MethodGet:
			userController.GetMyProfile(w, r)
		case http.MethodPut:
			userController.UpdateMyProfile(w, r)
		default:
			w.WriteHeader(http.StatusMethodNotAllowed)
		}
	}))
	mux.HandleFunc("/api/stakeholders/users/logout", authMiddleware.RequireAuth(userController.LogoutUser))
	mux.HandleFunc("/api/stakeholders/users", authMiddleware.RequireAuth(roleMiddleware.RequireRole("admin", userController.GetUsers)))
	mux.HandleFunc("/api/stakeholders/users/block", authMiddleware.RequireAuth(roleMiddleware.RequireRole("admin", userController.BlockUser)))

	return corsMiddleware.Handler(mux)
}
