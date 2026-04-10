package repository

import (
	"context"

	"soa-project/stakeholders/internal/domain"
)

type UserRepository interface {
	EnsureConstraints(ctx context.Context) error
	FindByUsernameOrEmail(ctx context.Context, username, email string) (*domain.User, error)
	FindByUsername(ctx context.Context, username string) (*domain.User, error)
	FindAllPaged(ctx context.Context, page, pageSize int, status string) ([]domain.User, int, error)
	BlockByUsername(ctx context.Context, username string, blockedAt string) (*domain.User, error)
	Create(ctx context.Context, user *domain.User) error
}
