package service

import (
	"context"
	"fmt"
	"strings"
	"time"

	"soa-project/stakeholders/internal/apperror"
	"soa-project/stakeholders/internal/domain"
	"soa-project/stakeholders/internal/dto"
	"soa-project/stakeholders/internal/repository"
)

type UserBlockService interface {
	BlockUser(ctx context.Context, adminUsername, username string) (*dto.UserListItem, error)
}

type userBlockService struct {
	userRepository repository.UserRepository
}

func NewUserBlockService(userRepository repository.UserRepository) UserBlockService {
	return &userBlockService{userRepository: userRepository}
}

func (s *userBlockService) BlockUser(ctx context.Context, adminUsername, username string) (*dto.UserListItem, error) {
	adminUsername = strings.TrimSpace(adminUsername)
	username = strings.TrimSpace(username)

	if username == "" {
		return nil, fmt.Errorf("%w: username is required", apperror.ErrValidation)
	}
	if adminUsername == username {
		return nil, fmt.Errorf("%w: admin cannot block own account", apperror.ErrValidation)
	}

	user, err := s.userRepository.FindByUsername(ctx, username)
	if err != nil {
		return nil, err
	}
	if user == nil {
		return nil, fmt.Errorf("%w: user not found", apperror.ErrValidation)
	}
	if user.Role == domain.RoleAdmin {
		return nil, fmt.Errorf("%w: admin accounts cannot be blocked", apperror.ErrValidation)
	}
	if user.IsBlocked {
		return nil, fmt.Errorf("%w: user is already blocked", apperror.ErrValidation)
	}

	blockTime := time.Now().UTC()
	updatedUser, err := s.userRepository.BlockByUsername(ctx, username, blockTime.Format(time.RFC3339))
	if err != nil {
		return nil, err
	}

	return &dto.UserListItem{
		Username:  updatedUser.Username,
		Email:     updatedUser.Email,
		Role:      updatedUser.Role,
		IsBlocked: updatedUser.IsBlocked,
		CreatedAt: updatedUser.CreatedAt.Format(time.RFC3339),
		BlockedAt: blockedAtLabel(updatedUser.BlockedAt),
	}, nil
}
