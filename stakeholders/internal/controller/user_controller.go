package controller

import (
	"encoding/json"
	"errors"
	"net/http"
	"strconv"

	"soa-project/stakeholders/internal/apperror"
	"soa-project/stakeholders/internal/auth"
	"soa-project/stakeholders/internal/dto"
	"soa-project/stakeholders/internal/service"
)

type UserController struct {
	registrationService service.UserRegistrationService
	loginService        service.UserLoginService
	userListService     service.UserListService
}

func NewUserController(
	registrationService service.UserRegistrationService,
	loginService service.UserLoginService,
	userListService service.UserListService,
) *UserController {
	return &UserController{
		registrationService: registrationService,
		loginService:        loginService,
		userListService:     userListService,
	}
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

func (c *UserController) LoginUser(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeJSON(w, http.StatusMethodNotAllowed, dto.ErrorResponse{Message: "method not allowed"})
		return
	}

	var request dto.UserLoginRequest
	if err := json.NewDecoder(r.Body).Decode(&request); err != nil {
		writeJSON(w, http.StatusBadRequest, dto.ErrorResponse{Message: "invalid request body"})
		return
	}

	response, err := c.loginService.LoginUser(r.Context(), request)
	if err != nil {
		switch {
		case errors.Is(err, apperror.ErrValidation):
			writeJSON(w, http.StatusBadRequest, dto.ErrorResponse{Message: err.Error()})
		case errors.Is(err, apperror.ErrInvalidCredentials):
			writeJSON(w, http.StatusUnauthorized, dto.ErrorResponse{Message: err.Error()})
		case errors.Is(err, apperror.ErrUserBlocked):
			writeJSON(w, http.StatusForbidden, dto.ErrorResponse{Message: err.Error()})
		default:
			writeJSON(w, http.StatusInternalServerError, dto.ErrorResponse{Message: "internal server error"})
		}
		return
	}

	writeJSON(w, http.StatusOK, response)
}

func (c *UserController) GetAuthenticatedUser(w http.ResponseWriter, r *http.Request) {
	identity, ok := auth.IdentityFromContext(r.Context())
	if !ok {
		writeJSON(w, http.StatusUnauthorized, dto.ErrorResponse{Message: "authenticated user not found in context"})
		return
	}

	writeJSON(w, http.StatusOK, dto.UserInfo{
		ID:       identity.UserID,
		Username: identity.Username,
		Email:    identity.Email,
		Role:     identity.Role,
	})
}

func (c *UserController) LogoutUser(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeJSON(w, http.StatusMethodNotAllowed, dto.ErrorResponse{Message: "method not allowed"})
		return
	}

	if _, ok := auth.IdentityFromContext(r.Context()); !ok {
		writeJSON(w, http.StatusUnauthorized, dto.ErrorResponse{Message: "authenticated user not found in context"})
		return
	}

	writeJSON(w, http.StatusOK, map[string]string{
		"message": "logout successful, remove token on client side",
	})
}

func (c *UserController) GetUsers(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		writeJSON(w, http.StatusMethodNotAllowed, dto.ErrorResponse{Message: "method not allowed"})
		return
	}

	page := 1
	status := r.URL.Query().Get("status")
	if status == "" {
		status = "all"
	}

	if pageQuery := r.URL.Query().Get("page"); pageQuery != "" {
		parsedPage, err := strconv.Atoi(pageQuery)
		if err != nil {
			writeJSON(w, http.StatusBadRequest, dto.ErrorResponse{Message: "page must be a valid integer"})
			return
		}
		page = parsedPage
	}

	response, err := c.userListService.GetPagedUsers(r.Context(), page, status)
	if err != nil {
		switch {
		case errors.Is(err, apperror.ErrValidation):
			writeJSON(w, http.StatusBadRequest, dto.ErrorResponse{Message: err.Error()})
		default:
			writeJSON(w, http.StatusInternalServerError, dto.ErrorResponse{Message: "internal server error"})
		}
		return
	}

	writeJSON(w, http.StatusOK, response)
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
