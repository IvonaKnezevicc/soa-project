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
	CreateComment(
		ctx context.Context,
		identity auth.Identity,
		postID string,
		request dto.CreateCommentRequest,
	) (*dto.CommentResponse, error)
	LikePost(ctx context.Context, identity auth.Identity, postID string) error
	UnlikePost(ctx context.Context, identity auth.Identity, postID string) error
	GetAll(ctx context.Context, identity auth.Identity) ([]dto.BlogPostResponse, error)
}

type blogPostService struct {
	blogPostRepository repository.BlogPostRepository
	followerClient     FollowerClient
}

func NewBlogPostService(blogPostRepository repository.BlogPostRepository, followerClient FollowerClient) BlogPostService {
	return &blogPostService{
		blogPostRepository: blogPostRepository,
		followerClient:     followerClient,
	}
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

func (s *blogPostService) GetAll(ctx context.Context, identity auth.Identity) ([]dto.BlogPostResponse, error) {
	posts, err := s.blogPostRepository.FindAll(ctx)
	if err != nil {
		return nil, err
	}

	allowedAuthors, err := s.followerClient.AllowedAuthors(ctx, identity.Username)
	if err != nil {
		return nil, err
	}

	postIDs := make([]string, 0, len(posts))
	for _, post := range posts {
		if post.AuthorUsername != identity.Username && !allowedAuthors[post.AuthorUsername] {
			continue
		}
		postIDs = append(postIDs, post.ID)
	}

	commentsByPostID, err := s.blogPostRepository.FindCommentsByPostIDs(ctx, postIDs)
	if err != nil {
		return nil, err
	}

	likeCountsByPostID, err := s.blogPostRepository.FindLikeCountsByPostIDs(ctx, postIDs)
	if err != nil {
		return nil, err
	}

	likedPostIDsByUser, err := s.blogPostRepository.FindLikedPostIDsByUser(ctx, postIDs, identity.UserID)
	if err != nil {
		return nil, err
	}

	response := make([]dto.BlogPostResponse, 0, len(posts))
	for _, post := range posts {
		if post.AuthorUsername != identity.Username && !allowedAuthors[post.AuthorUsername] {
			continue
		}

		response = append(response, dto.BlogPostResponse{
			ID:                  post.ID,
			Title:               post.Title,
			DescriptionMarkdown: post.DescriptionMarkdown,
			DescriptionHTML:     post.DescriptionHTML,
			ImageURLs:           post.ImageURLs,
			CreatedAt:           post.CreatedAt.Format(time.RFC3339),
			AuthorUsername:      post.AuthorUsername,
			Comments:            mapCommentsToResponse(commentsByPostID[post.ID]),
			LikeCount:           likeCountsByPostID[post.ID],
			LikedByCurrentUser:  likedPostIDsByUser[post.ID],
		})
	}

	return response, nil
}

func (s *blogPostService) CreateComment(
	ctx context.Context,
	identity auth.Identity,
	postID string,
	request dto.CreateCommentRequest,
) (*dto.CommentResponse, error) {
	postID = strings.TrimSpace(postID)
	text := strings.TrimSpace(request.Text)

	if postID == "" {
		return nil, fmt.Errorf("%w: postId is required", apperror.ErrValidation)
	}
	if text == "" {
		return nil, fmt.Errorf("%w: text is required", apperror.ErrValidation)
	}
	if len(text) > 2000 {
		return nil, fmt.Errorf("%w: comment text is too long", apperror.ErrValidation)
	}

	post, err := s.blogPostRepository.FindByID(ctx, postID)
	if err != nil {
		return nil, err
	}
	if post == nil {
		return nil, fmt.Errorf("%w: blog post not found", apperror.ErrValidation)
	}
	if post.AuthorUsername != identity.Username {
		canComment, err := s.followerClient.CanComment(ctx, identity.Username, post.AuthorUsername)
		if err != nil {
			return nil, err
		}
		if !canComment {
			return nil, fmt.Errorf("%w: follow this author before commenting", apperror.ErrValidation)
		}
	}

	now := time.Now().UTC()
	comment := &domain.Comment{
		ID:             generateID(),
		PostID:         postID,
		Text:           text,
		CreatedAt:      now,
		UpdatedAt:      now,
		AuthorUserID:   identity.UserID,
		AuthorUsername: identity.Username,
		AuthorEmail:    identity.Email,
		AuthorRole:     identity.Role,
	}

	if err := s.blogPostRepository.CreateComment(ctx, comment); err != nil {
		return nil, err
	}

	return &dto.CommentResponse{
		ID:             comment.ID,
		PostID:         comment.PostID,
		Text:           comment.Text,
		CreatedAt:      comment.CreatedAt.Format(time.RFC3339),
		UpdatedAt:      comment.UpdatedAt.Format(time.RFC3339),
		AuthorUserID:   comment.AuthorUserID,
		AuthorUsername: comment.AuthorUsername,
		AuthorEmail:    comment.AuthorEmail,
		AuthorRole:     comment.AuthorRole,
	}, nil
}

func (s *blogPostService) LikePost(ctx context.Context, identity auth.Identity, postID string) error {
	postID = strings.TrimSpace(postID)
	if postID == "" {
		return fmt.Errorf("%w: postId is required", apperror.ErrValidation)
	}

	post, err := s.blogPostRepository.FindByID(ctx, postID)
	if err != nil {
		return err
	}
	if post == nil {
		return fmt.Errorf("%w: blog post not found", apperror.ErrValidation)
	}

	return s.blogPostRepository.LikePost(
		ctx,
		postID,
		identity.UserID,
		identity.Username,
		identity.Email,
		identity.Role,
	)
}

func (s *blogPostService) UnlikePost(ctx context.Context, identity auth.Identity, postID string) error {
	postID = strings.TrimSpace(postID)
	if postID == "" {
		return fmt.Errorf("%w: postId is required", apperror.ErrValidation)
	}

	post, err := s.blogPostRepository.FindByID(ctx, postID)
	if err != nil {
		return err
	}
	if post == nil {
		return fmt.Errorf("%w: blog post not found", apperror.ErrValidation)
	}

	return s.blogPostRepository.UnlikePost(ctx, postID, identity.UserID)
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

func mapCommentsToResponse(comments []domain.Comment) []dto.CommentResponse {
	response := make([]dto.CommentResponse, 0, len(comments))
	for _, comment := range comments {
		response = append(response, dto.CommentResponse{
			ID:             comment.ID,
			PostID:         comment.PostID,
			Text:           comment.Text,
			CreatedAt:      comment.CreatedAt.Format(time.RFC3339),
			UpdatedAt:      comment.UpdatedAt.Format(time.RFC3339),
			AuthorUserID:   comment.AuthorUserID,
			AuthorUsername: comment.AuthorUsername,
			AuthorEmail:    comment.AuthorEmail,
			AuthorRole:     comment.AuthorRole,
		})
	}

	return response
}

func generateID() string {
	buffer := make([]byte, 16)
	if _, err := rand.Read(buffer); err != nil {
		panic(errors.New("failed to generate blog post id"))
	}
	return hex.EncodeToString(buffer)
}
