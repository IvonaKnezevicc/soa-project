package server

import (
	"net/http"

	"soa-project/stakeholders/internal/controller"
	"soa-project/stakeholders/internal/middleware"
)

func NewRouter(
	userController *controller.UserController,
	authMiddleware *middleware.AuthMiddleware,
) http.Handler {
	mux := http.NewServeMux()
	mux.HandleFunc("/health", userController.Health)
	mux.HandleFunc("/api/stakeholders/users/register", userController.RegisterUser)
	mux.HandleFunc("/api/stakeholders/users/login", userController.LoginUser)
	mux.HandleFunc("/api/stakeholders/users/me", authMiddleware.RequireAuth(userController.GetAuthenticatedUser))
	mux.HandleFunc("/api/stakeholders/users/logout", authMiddleware.RequireAuth(userController.LogoutUser))

	return mux
}
