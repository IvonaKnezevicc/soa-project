package service

import (
	"context"
	"fmt"
	"math"
	"strings"
	"time"

	"soa-project/stakeholders/internal/apperror"
	"soa-project/stakeholders/internal/dto"
	"soa-project/stakeholders/internal/repository"
)

const usersPageSize = 15

type UserListService interface {
	GetPagedUsers(ctx context.Context, page int, status string) (*dto.PagedUsersResponse, error)
	SearchUsers(ctx context.Context, role, prefix, excludeUsername string, limit int) (*dto.UserSearchResponse, error)
}

type userListService struct {
	userRepository repository.UserRepository
}

func NewUserListService(userRepository repository.UserRepository) UserListService {
	return &userListService{userRepository: userRepository}
}

func (s *userListService) GetPagedUsers(ctx context.Context, page int, status string) (*dto.PagedUsersResponse, error) {
	if page < 1 {
		return nil, fmt.Errorf("%w: page must be greater than 0", apperror.ErrValidation)
	}
	if status != "all" && status != "active" && status != "blocked" {
		return nil, fmt.Errorf("%w: status must be all, active or blocked", apperror.ErrValidation)
	}

	users, totalCount, err := s.userRepository.FindAllPaged(ctx, page, usersPageSize, status)
	if err != nil {
		return nil, err
	}

	items := make([]dto.UserListItem, 0, len(users))
	for _, user := range users {
		items = append(items, dto.UserListItem{
			Username:  user.Username,
			Email:     user.Email,
			Role:      user.Role,
			IsBlocked: user.IsBlocked,
			CreatedAt: user.CreatedAt.Format("2006-01-02T15:04:05Z07:00"),
			BlockedAt: blockedAtLabel(user.BlockedAt),
		})
	}

	totalPages := 0
	if totalCount > 0 {
		totalPages = int(math.Ceil(float64(totalCount) / float64(usersPageSize)))
	}

	return &dto.PagedUsersResponse{
		Items:      items,
		Page:       page,
		PageSize:   usersPageSize,
		TotalCount: totalCount,
		TotalPages: totalPages,
		Status:     status,
	}, nil
}

func (s *userListService) SearchUsers(
	ctx context.Context,
	role, prefix, excludeUsername string,
	limit int,
) (*dto.UserSearchResponse, error) {
	normalizedRole := strings.ToLower(strings.TrimSpace(role))
	if normalizedRole != "" && normalizedRole != "guide" && normalizedRole != "tourist" {
		return nil, fmt.Errorf("%w: role must be guide, tourist or empty", apperror.ErrValidation)
	}

	if limit < 1 {
		return nil, fmt.Errorf("%w: limit must be greater than 0", apperror.ErrValidation)
	}

	users, err := s.userRepository.SearchActiveByRoleAndUsernamePrefix(ctx, normalizedRole, prefix, excludeUsername, limit)
	if err != nil {
		return nil, err
	}

	items := make([]dto.UserSearchItem, 0, len(users))
	for _, user := range users {
		items = append(items, dto.UserSearchItem{
			Username: user.Username,
			Role:     user.Role,
		})
	}

	return &dto.UserSearchResponse{Items: items}, nil
}

func blockedAtLabel(blockedAt *time.Time) string {
	if blockedAt == nil {
		return "User is active"
	}

	return blockedAt.Format(time.RFC3339)
}
