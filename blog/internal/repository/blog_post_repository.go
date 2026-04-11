package repository

import (
	"context"

	"soa-project/blog/internal/domain"
)

type BlogPostRepository interface {
	EnsureConstraints(ctx context.Context) error
	Create(ctx context.Context, blogPost *domain.BlogPost) error
	FindByID(ctx context.Context, id string) (*domain.BlogPost, error)
	FindAll(ctx context.Context) ([]domain.BlogPost, error)
	CreateComment(ctx context.Context, comment *domain.Comment) error
	FindCommentsByPostIDs(ctx context.Context, postIDs []string) (map[string][]domain.Comment, error)
}
