package service

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/url"
	"path"
	"strings"
	"time"
)

type FollowerClient interface {
	AllowedAuthors(ctx context.Context, username string) (map[string]bool, error)
	CanComment(ctx context.Context, followerUsername, authorUsername string) (bool, error)
}

type followerHTTPClient struct {
	baseURL    string
	httpClient *http.Client
}

func NewFollowerClient(baseURL string) FollowerClient {
	return &followerHTTPClient{
		baseURL: strings.TrimRight(strings.TrimSpace(baseURL), "/"),
		httpClient: &http.Client{
			Timeout: 5 * time.Second,
		},
	}
}

func (c *followerHTTPClient) AllowedAuthors(ctx context.Context, username string) (map[string]bool, error) {
	endpoint, err := c.buildURL("/api/followers/internal/allowed-authors", map[string]string{
		"username": username,
	})
	if err != nil {
		return nil, err
	}

	request, err := http.NewRequestWithContext(ctx, http.MethodGet, endpoint, nil)
	if err != nil {
		return nil, err
	}

	response, err := c.httpClient.Do(request)
	if err != nil {
		return nil, err
	}
	defer response.Body.Close()

	if response.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("follower service returned status %d", response.StatusCode)
	}

	var payload struct {
		Usernames []string `json:"usernames"`
	}
	if err := json.NewDecoder(response.Body).Decode(&payload); err != nil {
		return nil, err
	}

	authors := make(map[string]bool, len(payload.Usernames))
	for _, followed := range payload.Usernames {
		trimmed := strings.TrimSpace(followed)
		if trimmed == "" {
			continue
		}
		authors[trimmed] = true
	}

	return authors, nil
}

func (c *followerHTTPClient) CanComment(ctx context.Context, followerUsername, authorUsername string) (bool, error) {
	endpoint, err := c.buildURL("/api/followers/internal/can-comment", map[string]string{
		"followerUsername": followerUsername,
		"authorUsername":   authorUsername,
	})
	if err != nil {
		return false, err
	}

	request, err := http.NewRequestWithContext(ctx, http.MethodGet, endpoint, nil)
	if err != nil {
		return false, err
	}

	response, err := c.httpClient.Do(request)
	if err != nil {
		return false, err
	}
	defer response.Body.Close()

	if response.StatusCode != http.StatusOK {
		return false, fmt.Errorf("follower service returned status %d", response.StatusCode)
	}

	var payload struct {
		CanComment bool `json:"canComment"`
	}
	if err := json.NewDecoder(response.Body).Decode(&payload); err != nil {
		return false, err
	}

	return payload.CanComment, nil
}

func (c *followerHTTPClient) buildURL(routePath string, query map[string]string) (string, error) {
	base, err := url.Parse(c.baseURL)
	if err != nil {
		return "", err
	}

	base.Path = path.Clean(base.Path + "/" + strings.TrimLeft(routePath, "/"))
	values := base.Query()
	for key, value := range query {
		values.Set(key, strings.TrimSpace(value))
	}
	base.RawQuery = values.Encode()

	return base.String(), nil
}
