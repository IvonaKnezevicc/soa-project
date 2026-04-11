package service

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/yuin/goldmark"

	"soa-project/blog/internal/apperror"
	"soa-project/blog/internal/auth"
	"soa-project/blog/internal/domain"
	"soa-project/blog/internal/dto"
	"soa-project/blog/internal/repository"
)

type BlogPostService interface {
	Create(ctx context.Context, identity auth.Identity, request dto.CreateBlogPostRequest) (*dto.BlogPostResponse, error)
	GetAll(ctx context.Context) ([]dto.BlogPostResponse, error)
}

type blogPostService struct {
	blogPostRepository repository.BlogPostRepository
}

func NewBlogPostService(blogPostRepository repository.BlogPostRepository) BlogPostService {
	return &blogPostService{blogPostRepository: blogPostRepository}
}

func (s *blogPostService) Create(
	ctx context.Context,
	identity auth.Identity,
	request dto.CreateBlogPostRequest,
) (*dto.BlogPostResponse, error) {
	title := strings.TrimSpace(request.Title)
	descriptionMarkdown := strings.TrimSpace(request.DescriptionMarkdown)
	imageURLs, err := normalizeImageURLs(request.ImageURLs)
	if err != nil {
		return nil, err
	}

	if title == "" {
		return nil, fmt.Errorf("%w: title is required", apperror.ErrValidation)
	}
	if len(title) > 200 {
		return nil, fmt.Errorf("%w: title can have at most 200 characters", apperror.ErrValidation)
	}
	if descriptionMarkdown == "" {
		return nil, fmt.Errorf("%w: descriptionMarkdown is required", apperror.ErrValidation)
	}
	if len(descriptionMarkdown) > 20000 {
		return nil, fmt.Errorf("%w: descriptionMarkdown is too long", apperror.ErrValidation)
	}

	descriptionHTML, err := markdownToHTML(descriptionMarkdown)
	if err != nil {
		return nil, err
	}

	blogPost := &domain.BlogPost{
		ID:                  generateID(),
		Title:               title,
		DescriptionMarkdown: descriptionMarkdown,
		DescriptionHTML:     descriptionHTML,
		ImageURLs:           imageURLs,
		CreatedAt:           time.Now().UTC(),
		AuthorUsername:      identity.Username,
		AuthorRole:          identity.Role,
	}

	if err := s.blogPostRepository.Create(ctx, blogPost); err != nil {
		return nil, err
	}

	return &dto.BlogPostResponse{
		ID:                  blogPost.ID,
		Title:               blogPost.Title,
		DescriptionMarkdown: blogPost.DescriptionMarkdown,
		DescriptionHTML:     blogPost.DescriptionHTML,
		ImageURLs:           blogPost.ImageURLs,
		CreatedAt:           blogPost.CreatedAt.Format(time.RFC3339),
		AuthorUsername:      blogPost.AuthorUsername,
	}, nil
}

func (s *blogPostService) GetAll(ctx context.Context) ([]dto.BlogPostResponse, error) {
	posts, err := s.blogPostRepository.FindAll(ctx)
	if err != nil {
		return nil, err
	}

	response := make([]dto.BlogPostResponse, 0, len(posts))
	for _, post := range posts {
		response = append(response, dto.BlogPostResponse{
			ID:                  post.ID,
			Title:               post.Title,
			DescriptionMarkdown: post.DescriptionMarkdown,
			DescriptionHTML:     post.DescriptionHTML,
			ImageURLs:           post.ImageURLs,
			CreatedAt:           post.CreatedAt.Format(time.RFC3339),
			AuthorUsername:      post.AuthorUsername,
		})
	}

	return response, nil
}

func markdownToHTML(markdown string) (string, error) {
	var builder strings.Builder
	if err := goldmark.Convert([]byte(markdown), &builder); err != nil {
		return "", err
	}
	return builder.String(), nil
}

func normalizeImageURLs(imageURLs []string) ([]string, error) {
	normalized := make([]string, 0, len(imageURLs))
	for _, imageURL := range imageURLs {
		trimmed := strings.TrimSpace(imageURL)
		if trimmed == "" {
			continue
		}
		if len(trimmed) > 2_000_000 {
			return nil, fmt.Errorf("%w: image is too large", apperror.ErrValidation)
		}
		normalized = append(normalized, trimmed)
	}

	if len(normalized) > 10 {
		return nil, fmt.Errorf("%w: at most 10 images are allowed", apperror.ErrValidation)
	}

	return normalized, nil
}

func generateID() string {
	buffer := make([]byte, 16)
	if _, err := rand.Read(buffer); err != nil {
		panic(errors.New("failed to generate blog post id"))
	}
	return hex.EncodeToString(buffer)
}
