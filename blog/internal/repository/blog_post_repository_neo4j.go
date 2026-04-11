package repository

import (
	"context"
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

	_, err := session.Run(ctx, `
		CREATE CONSTRAINT blog_post_id_unique IF NOT EXISTS
		FOR (b:BlogPost)
		REQUIRE b.id IS UNIQUE
	`, nil)
	return err
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
