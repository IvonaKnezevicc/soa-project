package repository

import (
	"context"

	"soa-project/stakeholders/internal/domain"
)

type UserRepository interface {
	EnsureConstraints(ctx context.Context) error
	FindByUsernameOrEmail(ctx context.Context, username, email string) (*domain.User, error)
	Create(ctx context.Context, user *domain.User) error
}
