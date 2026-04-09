package server

import (
	"net/http"

	"soa-project/stakeholders/internal/controller"
)

func NewRouter(userController *controller.UserController) http.Handler {
	mux := http.NewServeMux()
	mux.HandleFunc("/health", userController.Health)
	mux.HandleFunc("/api/stakeholders/users/register", userController.RegisterUser)

	return mux
}
