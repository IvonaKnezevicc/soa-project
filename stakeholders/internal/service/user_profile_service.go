package service

import (
	"context"
	"fmt"
	"strings"

	"soa-project/stakeholders/internal/apperror"
	"soa-project/stakeholders/internal/dto"
	"soa-project/stakeholders/internal/repository"
)

type UserProfileService interface {
	GetProfile(ctx context.Context, username string) (*dto.UserProfileResponse, error)
	UpdateProfile(ctx context.Context, username string, request dto.UpdateUserProfileRequest) (*dto.UserProfileResponse, error)
	ExistsByUsername(ctx context.Context, username string) (bool, error)
}

type userProfileService struct {
	userRepository repository.UserRepository
}

func NewUserProfileService(userRepository repository.UserRepository) UserProfileService {
	return &userProfileService{userRepository: userRepository}
}

func (s *userProfileService) GetProfile(ctx context.Context, username string) (*dto.UserProfileResponse, error) {
	username = strings.TrimSpace(username)
	if username == "" {
		return nil, fmt.Errorf("%w: username is required", apperror.ErrValidation)
	}

	user, err := s.userRepository.FindByUsername(ctx, username)
	if err != nil {
		return nil, err
	}
	if user == nil {
		return nil, fmt.Errorf("%w: user not found", apperror.ErrValidation)
	}

	return &dto.UserProfileResponse{
		ID:           user.ID,
		Username:     user.Username,
		Email:        user.Email,
		Role:         user.Role,
		FirstName:    user.FirstName,
		LastName:     user.LastName,
		ProfileImage: user.ProfileImage,
		Biography:    user.Biography,
		Motto:        user.Motto,
	}, nil
}

func (s *userProfileService) UpdateProfile(
	ctx context.Context,
	username string,
	request dto.UpdateUserProfileRequest,
) (*dto.UserProfileResponse, error) {
	username = strings.TrimSpace(username)
	if username == "" {
		return nil, fmt.Errorf("%w: username is required", apperror.ErrValidation)
	}

	firstName := strings.TrimSpace(request.FirstName)
	lastName := strings.TrimSpace(request.LastName)
	profileImage := strings.TrimSpace(request.ProfileImage)
	biography := strings.TrimSpace(request.Biography)
	motto := strings.TrimSpace(request.Motto)

	if len(firstName) > 100 {
		return nil, fmt.Errorf("%w: firstName can have at most 100 characters", apperror.ErrValidation)
	}
	if len(lastName) > 100 {
		return nil, fmt.Errorf("%w: lastName can have at most 100 characters", apperror.ErrValidation)
	}
	if len(profileImage) > 2_000_000 {
		return nil, fmt.Errorf("%w: profileImage is too large", apperror.ErrValidation)
	}
	if len(biography) > 1000 {
		return nil, fmt.Errorf("%w: biography can have at most 1000 characters", apperror.ErrValidation)
	}
	if len(motto) > 250 {
		return nil, fmt.Errorf("%w: motto can have at most 250 characters", apperror.ErrValidation)
	}

	user, err := s.userRepository.UpdateProfileByUsername(
		ctx,
		username,
		firstName,
		lastName,
		profileImage,
		biography,
		motto,
	)
	if err != nil {
		return nil, err
	}
	if user == nil {
		return nil, fmt.Errorf("%w: user not found", apperror.ErrValidation)
	}

	return &dto.UserProfileResponse{
		ID:           user.ID,
		Username:     user.Username,
		Email:        user.Email,
		Role:         user.Role,
		FirstName:    user.FirstName,
		LastName:     user.LastName,
		ProfileImage: user.ProfileImage,
		Biography:    user.Biography,
		Motto:        user.Motto,
	}, nil
}

func (s *userProfileService) ExistsByUsername(ctx context.Context, username string) (bool, error) {
	username = strings.TrimSpace(username)
	if username == "" {
		return false, fmt.Errorf("%w: username is required", apperror.ErrValidation)
	}

	user, err := s.userRepository.FindByUsername(ctx, username)
	if err != nil {
		return false, err
	}

	return user != nil, nil
}
