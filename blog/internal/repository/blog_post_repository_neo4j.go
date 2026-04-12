package repository

import (
	"context"
	"fmt"
	"time"

	"github.com/neo4j/neo4j-go-driver/v5/neo4j"
	"github.com/neo4j/neo4j-go-driver/v5/neo4j/dbtype"

	"soa-project/blog/internal/domain"
)

type Neo4jBlogPostRepository struct {
	driver   neo4j.DriverWithContext
	database string
}

func NewNeo4jBlogPostRepository(driver neo4j.DriverWithContext, database string) *Neo4jBlogPostRepository {
	return &Neo4jBlogPostRepository{
		driver:   driver,
		database: database,
	}
}

func (r *Neo4jBlogPostRepository) EnsureConstraints(ctx context.Context) error {
	session := r.driver.NewSession(ctx, neo4j.SessionConfig{DatabaseName: r.database})
	defer session.Close(ctx)

	constraints := []string{
		`
			CREATE CONSTRAINT blog_post_id_unique IF NOT EXISTS
			FOR (b:BlogPost)
			REQUIRE b.id IS UNIQUE
		`,
		`
			CREATE CONSTRAINT comment_id_unique IF NOT EXISTS
			FOR (c:Comment)
			REQUIRE c.id IS UNIQUE
		`,
	}

	for _, query := range constraints {
		if _, err := session.Run(ctx, query, nil); err != nil {
			return err
		}
	}

	return nil
}

func (r *Neo4jBlogPostRepository) Create(ctx context.Context, blogPost *domain.BlogPost) error {
	session := r.driver.NewSession(ctx, neo4j.SessionConfig{DatabaseName: r.database})
	defer session.Close(ctx)

	_, err := session.Run(ctx, `
		CREATE (b:BlogPost {
			id: $id,
			title: $title,
			descriptionMarkdown: $descriptionMarkdown,
			descriptionHTML: $descriptionHTML,
			imageUrls: $imageUrls,
			createdAt: datetime($createdAt),
			authorUsername: $authorUsername,
			authorRole: $authorRole
		})
	`, map[string]any{
		"id":                  blogPost.ID,
		"title":               blogPost.Title,
		"descriptionMarkdown": blogPost.DescriptionMarkdown,
		"descriptionHTML":     blogPost.DescriptionHTML,
		"imageUrls":           blogPost.ImageURLs,
		"createdAt":           blogPost.CreatedAt.Format("2006-01-02T15:04:05Z07:00"),
		"authorUsername":      blogPost.AuthorUsername,
		"authorRole":          blogPost.AuthorRole,
	})

	return err
}

func (r *Neo4jBlogPostRepository) FindByID(ctx context.Context, id string) (*domain.BlogPost, error) {
	session := r.driver.NewSession(ctx, neo4j.SessionConfig{DatabaseName: r.database})
	defer session.Close(ctx)

	result, err := session.Run(ctx, `
		MATCH (b:BlogPost)
		WHERE b.id = $id
		RETURN b
		LIMIT 1
	`, map[string]any{
		"id": id,
	})
	if err != nil {
		return nil, err
	}

	if !result.Next(ctx) {
		if err := result.Err(); err != nil {
			return nil, err
		}
		return nil, nil
	}

	nodeValue, found := result.Record().Get("b")
	if !found {
		return nil, nil
	}

	node, ok := nodeValue.(dbtype.Node)
	if !ok {
		return nil, nil
	}

	return &domain.BlogPost{
		ID:                  stringValue(node.Props["id"]),
		Title:               stringValue(node.Props["title"]),
		DescriptionMarkdown: stringValue(node.Props["descriptionMarkdown"]),
		DescriptionHTML:     stringValue(node.Props["descriptionHTML"]),
		ImageURLs:           stringSliceValue(node.Props["imageUrls"]),
		CreatedAt:           timeValue(node.Props["createdAt"]),
		AuthorUsername:      stringValue(node.Props["authorUsername"]),
		AuthorRole:          stringValue(node.Props["authorRole"]),
	}, nil
}

func (r *Neo4jBlogPostRepository) FindAll(ctx context.Context) ([]domain.BlogPost, error) {
	session := r.driver.NewSession(ctx, neo4j.SessionConfig{DatabaseName: r.database})
	defer session.Close(ctx)

	result, err := session.Run(ctx, `
		MATCH (b:BlogPost)
		RETURN b
		ORDER BY b.createdAt DESC
		LIMIT 100
	`, nil)
	if err != nil {
		return nil, err
	}

	posts := make([]domain.BlogPost, 0)
	for result.Next(ctx) {
		nodeValue, found := result.Record().Get("b")
		if !found {
			continue
		}

		node, ok := nodeValue.(dbtype.Node)
		if !ok {
			continue
		}

		posts = append(posts, domain.BlogPost{
			ID:                  stringValue(node.Props["id"]),
			Title:               stringValue(node.Props["title"]),
			DescriptionMarkdown: stringValue(node.Props["descriptionMarkdown"]),
			DescriptionHTML:     stringValue(node.Props["descriptionHTML"]),
			ImageURLs:           stringSliceValue(node.Props["imageUrls"]),
			CreatedAt:           timeValue(node.Props["createdAt"]),
			AuthorUsername:      stringValue(node.Props["authorUsername"]),
			AuthorRole:          stringValue(node.Props["authorRole"]),
		})
	}

	if err := result.Err(); err != nil {
		return nil, err
	}

	return posts, nil
}

func (r *Neo4jBlogPostRepository) CreateComment(ctx context.Context, comment *domain.Comment) error {
	session := r.driver.NewSession(ctx, neo4j.SessionConfig{DatabaseName: r.database})
	defer session.Close(ctx)

	_, err := session.Run(ctx, `
		MATCH (b:BlogPost)
		WHERE b.id = $postId
		CREATE (c:Comment {
			id: $id,
			postId: $postId,
			text: $text,
			createdAt: datetime($createdAt),
			updatedAt: datetime($updatedAt),
			authorUserId: $authorUserId,
			authorUsername: $authorUsername,
			authorEmail: $authorEmail,
			authorRole: $authorRole
		})
		CREATE (b)-[:HAS_COMMENT]->(c)
	`, map[string]any{
		"id":             comment.ID,
		"postId":         comment.PostID,
		"text":           comment.Text,
		"createdAt":      comment.CreatedAt.Format(time.RFC3339),
		"updatedAt":      comment.UpdatedAt.Format(time.RFC3339),
		"authorUserId":   comment.AuthorUserID,
		"authorUsername": comment.AuthorUsername,
		"authorEmail":    comment.AuthorEmail,
		"authorRole":     comment.AuthorRole,
	})

	return err
}

func (r *Neo4jBlogPostRepository) FindCommentsByPostIDs(
	ctx context.Context,
	postIDs []string,
) (map[string][]domain.Comment, error) {
	commentsByPostID := make(map[string][]domain.Comment, len(postIDs))
	for _, postID := range postIDs {
		commentsByPostID[postID] = []domain.Comment{}
	}

	if len(postIDs) == 0 {
		return commentsByPostID, nil
	}

	session := r.driver.NewSession(ctx, neo4j.SessionConfig{DatabaseName: r.database})
	defer session.Close(ctx)

	result, err := session.Run(ctx, `
		MATCH (b:BlogPost)-[:HAS_COMMENT]->(c:Comment)
		WHERE b.id IN $postIds
		RETURN b.id AS postId, c
		ORDER BY c.createdAt ASC
	`, map[string]any{
		"postIds": postIDs,
	})
	if err != nil {
		return nil, err
	}

	for result.Next(ctx) {
		postIDValue, found := result.Record().Get("postId")
		if !found {
			continue
		}

		postID, ok := postIDValue.(string)
		if !ok {
			continue
		}

		nodeValue, found := result.Record().Get("c")
		if !found {
			continue
		}

		node, ok := nodeValue.(dbtype.Node)
		if !ok {
			continue
		}

		commentsByPostID[postID] = append(commentsByPostID[postID], mapNodeToComment(node))
	}

	if err := result.Err(); err != nil {
		return nil, err
	}

	return commentsByPostID, nil
}

func (r *Neo4jBlogPostRepository) LikePost(
	ctx context.Context,
	postID string,
	userID, username, email, role string,
) error {
	session := r.driver.NewSession(ctx, neo4j.SessionConfig{DatabaseName: r.database})
	defer session.Close(ctx)

	_, err := session.Run(ctx, `
		MATCH (b:BlogPost)
		WHERE b.id = $postId
		MERGE (u:BlogUser {userId: $userId})
		SET u.username = $username,
			u.email = $email,
			u.role = $role
		MERGE (u)-[:LIKED]->(b)
	`, map[string]any{
		"postId":   postID,
		"userId":   userID,
		"username": username,
		"email":    email,
		"role":     role,
	})

	return err
}

func (r *Neo4jBlogPostRepository) UnlikePost(ctx context.Context, postID, userID string) error {
	session := r.driver.NewSession(ctx, neo4j.SessionConfig{DatabaseName: r.database})
	defer session.Close(ctx)

	_, err := session.Run(ctx, `
		MATCH (u:BlogUser {userId: $userId})-[r:LIKED]->(b:BlogPost {id: $postId})
		DELETE r
	`, map[string]any{
		"postId": postID,
		"userId": userID,
	})

	return err
}

func (r *Neo4jBlogPostRepository) FindLikeCountsByPostIDs(
	ctx context.Context,
	postIDs []string,
) (map[string]int, error) {
	likeCountsByPostID := make(map[string]int, len(postIDs))
	for _, postID := range postIDs {
		likeCountsByPostID[postID] = 0
	}

	if len(postIDs) == 0 {
		return likeCountsByPostID, nil
	}

	session := r.driver.NewSession(ctx, neo4j.SessionConfig{DatabaseName: r.database})
	defer session.Close(ctx)

	result, err := session.Run(ctx, `
		MATCH (b:BlogPost)
		WHERE b.id IN $postIds
		OPTIONAL MATCH (:BlogUser)-[r:LIKED]->(b)
		RETURN b.id AS postId, count(r) AS likeCount
	`, map[string]any{
		"postIds": postIDs,
	})
	if err != nil {
		return nil, err
	}

	for result.Next(ctx) {
		postIDValue, found := result.Record().Get("postId")
		if !found {
			continue
		}

		postID, ok := postIDValue.(string)
		if !ok {
			continue
		}

		likeCountValue, found := result.Record().Get("likeCount")
		if !found {
			continue
		}

		likeCount, err := intValue(likeCountValue)
		if err != nil {
			return nil, err
		}

		likeCountsByPostID[postID] = likeCount
	}

	if err := result.Err(); err != nil {
		return nil, err
	}

	return likeCountsByPostID, nil
}

func (r *Neo4jBlogPostRepository) FindLikedPostIDsByUser(
	ctx context.Context,
	postIDs []string,
	userID string,
) (map[string]bool, error) {
	likedPostIDs := make(map[string]bool, len(postIDs))
	for _, postID := range postIDs {
		likedPostIDs[postID] = false
	}

	if len(postIDs) == 0 || userID == "" {
		return likedPostIDs, nil
	}

	session := r.driver.NewSession(ctx, neo4j.SessionConfig{DatabaseName: r.database})
	defer session.Close(ctx)

	result, err := session.Run(ctx, `
		MATCH (:BlogUser {userId: $userId})-[:LIKED]->(b:BlogPost)
		WHERE b.id IN $postIds
		RETURN b.id AS postId
	`, map[string]any{
		"userId":  userID,
		"postIds": postIDs,
	})
	if err != nil {
		return nil, err
	}

	for result.Next(ctx) {
		postIDValue, found := result.Record().Get("postId")
		if !found {
			continue
		}

		postID, ok := postIDValue.(string)
		if !ok {
			continue
		}

		likedPostIDs[postID] = true
	}

	if err := result.Err(); err != nil {
		return nil, err
	}

	return likedPostIDs, nil
}

func stringValue(value any) string {
	if typed, ok := value.(string); ok {
		return typed
	}
	return ""
}

func stringSliceValue(value any) []string {
	switch typed := value.(type) {
	case []string:
		return typed
	case []any:
		result := make([]string, 0, len(typed))
		for _, item := range typed {
			if str, ok := item.(string); ok {
				result = append(result, str)
			}
		}
		return result
	default:
		return []string{}
	}
}

func timeValue(value any) time.Time {
	if typed, ok := value.(time.Time); ok {
		return typed
	}
	return time.Time{}
}

func intValue(value any) (int, error) {
	switch typed := value.(type) {
	case int64:
		return int(typed), nil
	case int:
		return typed, nil
	default:
		return 0, fmt.Errorf("unsupported integer value type %T", value)
	}
}

func mapNodeToComment(node dbtype.Node) domain.Comment {
	return domain.Comment{
		ID:             stringValue(node.Props["id"]),
		PostID:         stringValue(node.Props["postId"]),
		Text:           stringValue(node.Props["text"]),
		CreatedAt:      timeValue(node.Props["createdAt"]),
		UpdatedAt:      timeValue(node.Props["updatedAt"]),
		AuthorUserID:   stringValue(node.Props["authorUserId"]),
		AuthorUsername: stringValue(node.Props["authorUsername"]),
		AuthorEmail:    stringValue(node.Props["authorEmail"]),
		AuthorRole:     stringValue(node.Props["authorRole"]),
	}
}
