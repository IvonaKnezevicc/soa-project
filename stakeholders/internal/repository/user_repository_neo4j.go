package repository

import (
	"context"
	"errors"
	"time"

	"github.com/neo4j/neo4j-go-driver/v5/neo4j"
	"github.com/neo4j/neo4j-go-driver/v5/neo4j/dbtype"

	"soa-project/stakeholders/internal/domain"
)

type Neo4jUserRepository struct {
	driver   neo4j.DriverWithContext
	database string
}

func NewNeo4jUserRepository(driver neo4j.DriverWithContext, database string) *Neo4jUserRepository {
	return &Neo4jUserRepository{
		driver:   driver,
		database: database,
	}
}

func (r *Neo4jUserRepository) EnsureConstraints(ctx context.Context) error {
	session := r.driver.NewSession(ctx, neo4j.SessionConfig{DatabaseName: r.database})
	defer session.Close(ctx)

	constraints := []string{
		"CREATE CONSTRAINT user_id_unique IF NOT EXISTS FOR (u:User) REQUIRE u.id IS UNIQUE",
		"CREATE CONSTRAINT user_username_unique IF NOT EXISTS FOR (u:User) REQUIRE u.username IS UNIQUE",
		"CREATE CONSTRAINT user_email_unique IF NOT EXISTS FOR (u:User) REQUIRE u.email IS UNIQUE",
	}

	for _, query := range constraints {
		if _, err := session.Run(ctx, query, nil); err != nil {
			return err
		}
	}

	return nil
}

func (r *Neo4jUserRepository) FindByUsernameOrEmail(ctx context.Context, username, email string) (*domain.User, error) {
	session := r.driver.NewSession(ctx, neo4j.SessionConfig{DatabaseName: r.database})
	defer session.Close(ctx)

	result, err := session.Run(ctx, `
		MATCH (u:User)
		WHERE u.username = $username OR u.email = $email
		RETURN u
		LIMIT 1
	`, map[string]any{
		"username": username,
		"email":    email,
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

	node, err := getUserNode(result.Record())
	if err != nil {
		return nil, err
	}

	user, err := mapNodeToUser(node)
	if err != nil {
		return nil, err
	}

	return user, nil
}

func (r *Neo4jUserRepository) Create(ctx context.Context, user *domain.User) error {
	session := r.driver.NewSession(ctx, neo4j.SessionConfig{DatabaseName: r.database})
	defer session.Close(ctx)

	_, err := session.Run(ctx, `
		CREATE (u:User {
			id: $id,
			username: $username,
			email: $email,
			passwordHash: $passwordHash,
			role: $role,
			isBlocked: $isBlocked,
			createdAt: datetime($createdAt)
		})
	`, map[string]any{
		"id":           user.ID,
		"username":     user.Username,
		"email":        user.Email,
		"passwordHash": user.PasswordHash,
		"role":         user.Role,
		"isBlocked":    user.IsBlocked,
		"createdAt":    user.CreatedAt.Format(time.RFC3339),
	})

	return err
}

func getUserNode(record *neo4j.Record) (dbtype.Node, error) {
	value, found := record.Get("u")
	if !found {
		return dbtype.Node{}, errors.New("user node not found in neo4j record")
	}

	node, ok := value.(dbtype.Node)
	if !ok {
		return dbtype.Node{}, errors.New("neo4j record is not a node")
	}

	return node, nil
}

func mapNodeToUser(node dbtype.Node) (*domain.User, error) {
	return &domain.User{
		ID:           stringValue(node.Props["id"]),
		Username:     stringValue(node.Props["username"]),
		Email:        stringValue(node.Props["email"]),
		PasswordHash: stringValue(node.Props["passwordHash"]),
		Role:         stringValue(node.Props["role"]),
		IsBlocked:    boolValue(node.Props["isBlocked"]),
		CreatedAt:    timeValue(node.Props["createdAt"]),
	}, nil
}

func stringValue(value any) string {
	if typed, ok := value.(string); ok {
		return typed
	}
	return ""
}

func boolValue(value any) bool {
	if typed, ok := value.(bool); ok {
		return typed
	}
	return false
}

func timeValue(value any) time.Time {
	if typed, ok := value.(time.Time); ok {
		return typed
	}
	return time.Time{}
}
