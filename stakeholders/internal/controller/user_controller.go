package controller

import (
	"encoding/json"
	"errors"
	"net/http"

	"soa-project/stakeholders/internal/apperror"
	"soa-project/stakeholders/internal/dto"
	"soa-project/stakeholders/internal/service"
)

type UserController struct {
	registrationService service.UserRegistrationService
}

func NewUserController(registrationService service.UserRegistrationService) *UserController {
	return &UserController{registrationService: registrationService}
}

func (c *UserController) RegisterUser(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeJSON(w, http.StatusMethodNotAllowed, dto.ErrorResponse{Message: "method not allowed"})
		return
	}

	var request dto.UserRegistrationRequest
	if err := json.NewDecoder(r.Body).Decode(&request); err != nil {
		writeJSON(w, http.StatusBadRequest, dto.ErrorResponse{Message: "invalid request body"})
		return
	}

	response, err := c.registrationService.RegisterUser(r.Context(), request)
	if err != nil {
		switch {
		case errors.Is(err, apperror.ErrValidation):
			writeJSON(w, http.StatusBadRequest, dto.ErrorResponse{Message: err.Error()})
		case errors.Is(err, apperror.ErrUserAlreadyExists):
			writeJSON(w, http.StatusConflict, dto.ErrorResponse{Message: err.Error()})
		default:
			writeJSON(w, http.StatusInternalServerError, dto.ErrorResponse{Message: "internal server error"})
		}
		return
	}

	writeJSON(w, http.StatusCreated, response)
}

func (c *UserController) Health(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		writeJSON(w, http.StatusMethodNotAllowed, dto.ErrorResponse{Message: "method not allowed"})
		return
	}

	writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
}

func writeJSON(w http.ResponseWriter, status int, payload any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(payload)
}
