package service

import (
	"context"
	"fmt"
	"strings"

	"golang.org/x/crypto/bcrypt"

	"soa-project/stakeholders/internal/apperror"
	"soa-project/stakeholders/internal/dto"
	"soa-project/stakeholders/internal/repository"
)

type UserLoginService interface {
	LoginUser(ctx context.Context, request dto.UserLoginRequest) (*dto.UserLoginResponse, error)
}

type userLoginService struct {
	userRepository repository.UserRepository
	jwtService     JWTService
}

func NewUserLoginService(userRepository repository.UserRepository, jwtService JWTService) UserLoginService {
	return &userLoginService{
		userRepository: userRepository,
		jwtService:     jwtService,
	}
}

func (s *userLoginService) LoginUser(ctx context.Context, request dto.UserLoginRequest) (*dto.UserLoginResponse, error) {
	if err := validateUserLoginRequest(request); err != nil {
		return nil, err
	}

	user, err := s.userRepository.FindByUsername(ctx, strings.TrimSpace(request.Username))
	if err != nil {
		return nil, err
	}
	if user == nil {
		return nil, fmt.Errorf("%w: username or password is incorrect", apperror.ErrInvalidCredentials)
	}
	if user.IsBlocked {
		return nil, fmt.Errorf("%w: blocked users cannot sign in", apperror.ErrUserBlocked)
	}
	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(request.Password)); err != nil {
		return nil, fmt.Errorf("%w: username or password is incorrect", apperror.ErrInvalidCredentials)
	}

	tokenDetails, err := s.jwtService.GenerateToken(user)
	if err != nil {
		return nil, err
	}

	return &dto.UserLoginResponse{
		AccessToken: tokenDetails.AccessToken,
		TokenType:   "Bearer",
		ExpiresIn:   tokenDetails.ExpiresIn,
		User: dto.UserInfo{
			ID:       user.ID,
			Username: user.Username,
			Email:    user.Email,
			Role:     user.Role,
		},
	}, nil
}

func validateUserLoginRequest(request dto.UserLoginRequest) error {
	if strings.TrimSpace(request.Username) == "" {
		return fmt.Errorf("%w: username is required", apperror.ErrValidation)
	}
	if strings.TrimSpace(request.Password) == "" {
		return fmt.Errorf("%w: password is required", apperror.ErrValidation)
	}

	return nil
}
