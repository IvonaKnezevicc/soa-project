package controller

import (
	"encoding/json"
	"net/http"
)

type StartupController struct{}

func NewStartupController() *StartupController {
	return &StartupController{}
}

func (c *StartupController) Health(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		writeJSON(w, http.StatusMethodNotAllowed, map[string]string{"message": "method not allowed"})
		return
	}

	writeJSON(w, http.StatusOK, map[string]string{
		"service": "blog",
		"status":  "ok",
	})
}

func (c *StartupController) StartupInfo(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		writeJSON(w, http.StatusMethodNotAllowed, map[string]string{"message": "method not allowed"})
		return
	}

	writeJSON(w, http.StatusOK, map[string]any{
		"service": "blog",
		"ready":   true,
		"message": "blog startup is ready for feature implementation",
	})
}

func writeJSON(w http.ResponseWriter, status int, payload any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(payload)
}
