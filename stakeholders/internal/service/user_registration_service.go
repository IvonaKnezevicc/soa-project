package service

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"errors"
	"fmt"
	"net/mail"
	"strings"
	"time"

	"golang.org/x/crypto/bcrypt"

	"soa-project/stakeholders/internal/apperror"
	"soa-project/stakeholders/internal/domain"
	"soa-project/stakeholders/internal/dto"
	"soa-project/stakeholders/internal/repository"
)

type UserRegistrationService interface {
	RegisterUser(ctx context.Context, request dto.UserRegistrationRequest) (*dto.UserRegistrationResponse, error)
}

type userRegistrationService struct {
	userRepository repository.UserRepository
	paymentClient  PaymentClient
}

func NewUserRegistrationService(userRepository repository.UserRepository, paymentClient PaymentClient) UserRegistrationService {
	return &userRegistrationService{
		userRepository: userRepository,
		paymentClient:  paymentClient,
	}
}

func (s *userRegistrationService) RegisterUser(ctx context.Context, request dto.UserRegistrationRequest) (*dto.UserRegistrationResponse, error) {
	if err := validateUserRegistrationRequest(request); err != nil {
		return nil, err
	}

	existingUser, err := s.userRepository.FindByUsernameOrEmail(ctx, request.Username, request.Email)
	if err != nil {
		return nil, err
	}
	if existingUser != nil {
		return nil, fmt.Errorf("%w: username or email already in use", apperror.ErrUserAlreadyExists)
	}

	passwordHash, err := bcrypt.GenerateFromPassword([]byte(request.Password), bcrypt.DefaultCost)
	if err != nil {
		return nil, err
	}

	user := &domain.User{
		ID:           generateID(),
		Username:     strings.TrimSpace(request.Username),
		Email:        strings.ToLower(strings.TrimSpace(request.Email)),
		PasswordHash: string(passwordHash),
		FirstName:    "",
		LastName:     "",
		ProfileImage: "",
		Biography:    "",
		Motto:        "",
		Role:         normalizeRole(request.Role),
		IsBlocked:    false,
		CreatedAt:    time.Now().UTC(),
	}

	if err := s.userRepository.Create(ctx, user); err != nil {
		return nil, err
	}

	if user.Role == domain.RoleTourist {
		if err := s.paymentClient.CreateWallet(ctx, user.ID); err != nil {
			if rollbackErr := s.userRepository.DeleteByID(ctx, user.ID); rollbackErr != nil {
				return nil, fmt.Errorf("wallet creation failed: %w; rollback failed: %v", err, rollbackErr)
			}
			return nil, fmt.Errorf("wallet creation failed: %w", err)
		}
	}

	return &dto.UserRegistrationResponse{
		ID:        user.ID,
		Username:  user.Username,
		Email:     user.Email,
		Role:      user.Role,
		IsBlocked: user.IsBlocked,
		CreatedAt: user.CreatedAt.Format(time.RFC3339),
	}, nil
}

func validateUserRegistrationRequest(request dto.UserRegistrationRequest) error {
	username := strings.TrimSpace(request.Username)
	email := strings.TrimSpace(request.Email)
	password := strings.TrimSpace(request.Password)
	role := normalizeRole(request.Role)

	if username == "" {
		return fmt.Errorf("%w: username is required", apperror.ErrValidation)
	}
	if len(username) < 3 {
		return fmt.Errorf("%w: username must contain at least 3 characters", apperror.ErrValidation)
	}
	if email == "" {
		return fmt.Errorf("%w: email is required", apperror.ErrValidation)
	}
	if _, err := mail.ParseAddress(email); err != nil {
		return fmt.Errorf("%w: email is not valid", apperror.ErrValidation)
	}
	if password == "" {
		return fmt.Errorf("%w: password is required", apperror.ErrValidation)
	}
	if len(password) < 5 {
		return fmt.Errorf("%w: password must contain at least 5 characters", apperror.ErrValidation)
	}
	if role == domain.RoleAdmin {
		return fmt.Errorf("%w: admin role cannot be registered through public endpoint", apperror.ErrValidation)
	}
	if role != domain.RoleGuide && role != domain.RoleTourist {
		return fmt.Errorf("%w: role must be guide or tourist", apperror.ErrValidation)
	}

	return nil
}

func normalizeRole(role string) string {
	return strings.ToLower(strings.TrimSpace(role))
}

func generateID() string {
	buffer := make([]byte, 16)
	if _, err := rand.Read(buffer); err != nil {
		panic(errors.New("failed to generate user id"))
	}
	return hex.EncodeToString(buffer)
}
