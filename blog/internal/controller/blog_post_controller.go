package controller

import (
	"encoding/json"
	"errors"
	"net/http"
	"strings"

	"soa-project/blog/internal/apperror"
	"soa-project/blog/internal/auth"
	"soa-project/blog/internal/dto"
	"soa-project/blog/internal/service"
)

type BlogPostController struct {
	blogPostService service.BlogPostService
}

func NewBlogPostController(blogPostService service.BlogPostService) *BlogPostController {
	return &BlogPostController{blogPostService: blogPostService}
}

func (c *BlogPostController) CreateBlogPost(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeJSON(w, http.StatusMethodNotAllowed, dto.ErrorResponse{Message: "method not allowed"})
		return
	}

	identity, ok := auth.IdentityFromContext(r.Context())
	if !ok {
		writeJSON(w, http.StatusUnauthorized, dto.ErrorResponse{Message: "authenticated user not found in context"})
		return
	}

	var request dto.CreateBlogPostRequest
	if err := json.NewDecoder(r.Body).Decode(&request); err != nil {
		writeJSON(w, http.StatusBadRequest, dto.ErrorResponse{Message: "invalid request body"})
		return
	}

	response, err := c.blogPostService.Create(r.Context(), identity, request)
	if err != nil {
		switch {
		case errors.Is(err, apperror.ErrValidation):
			writeJSON(w, http.StatusBadRequest, dto.ErrorResponse{Message: err.Error()})
		default:
			writeJSON(w, http.StatusInternalServerError, dto.ErrorResponse{Message: "internal server error"})
		}
		return
	}

	writeJSON(w, http.StatusCreated, response)
}

func (c *BlogPostController) GetBlogPosts(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		writeJSON(w, http.StatusMethodNotAllowed, dto.ErrorResponse{Message: "method not allowed"})
		return
	}

	response, err := c.blogPostService.GetAll(r.Context())
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, dto.ErrorResponse{Message: "internal server error"})
		return
	}

	writeJSON(w, http.StatusOK, response)
}

func (c *BlogPostController) CreateComment(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeJSON(w, http.StatusMethodNotAllowed, dto.ErrorResponse{Message: "method not allowed"})
		return
	}

	identity, ok := auth.IdentityFromContext(r.Context())
	if !ok {
		writeJSON(w, http.StatusUnauthorized, dto.ErrorResponse{Message: "authenticated user not found in context"})
		return
	}

	postID, ok := extractPostIDFromCommentsPath(r.URL.Path)
	if !ok {
		writeJSON(w, http.StatusBadRequest, dto.ErrorResponse{Message: "invalid blog post comment path"})
		return
	}

	var request dto.CreateCommentRequest
	if err := json.NewDecoder(r.Body).Decode(&request); err != nil {
		writeJSON(w, http.StatusBadRequest, dto.ErrorResponse{Message: "invalid request body"})
		return
	}

	response, err := c.blogPostService.CreateComment(r.Context(), identity, postID, request)
	if err != nil {
		switch {
		case errors.Is(err, apperror.ErrValidation):
			writeJSON(w, http.StatusBadRequest, dto.ErrorResponse{Message: err.Error()})
		default:
			writeJSON(w, http.StatusInternalServerError, dto.ErrorResponse{Message: "internal server error"})
		}
		return
	}

	writeJSON(w, http.StatusCreated, response)
}

func extractPostIDFromCommentsPath(path string) (string, bool) {
	postPath, found := strings.CutSuffix(path, "/comments")
	if !found {
		return "", false
	}

	postID, found := strings.CutPrefix(postPath, "/api/blog/posts/")
	if !found || strings.TrimSpace(postID) == "" {
		return "", false
	}

	if strings.Contains(postID, "/") {
		return "", false
	}

	return postID, true
}
