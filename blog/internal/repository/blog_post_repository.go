package repository

import (
	"context"

	"soa-project/blog/internal/domain"
)

type BlogPostRepository interface {
	EnsureConstraints(ctx context.Context) error
	Create(ctx context.Context, blogPost *domain.BlogPost) error
	FindAll(ctx context.Context) ([]domain.BlogPost, error)
}
