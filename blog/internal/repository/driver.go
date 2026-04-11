package repository

import (
	"context"

	"github.com/neo4j/neo4j-go-driver/v5/neo4j"

	"soa-project/blog/internal/config"
)

func NewNeo4jDriver(cfg *config.Config) (neo4j.DriverWithContext, error) {
	driver, err := neo4j.NewDriverWithContext(
		cfg.Neo4jURI,
		neo4j.BasicAuth(cfg.Neo4jUsername, cfg.Neo4jPassword, ""),
	)
	if err != nil {
		return nil, err
	}

	if err := driver.VerifyConnectivity(context.Background()); err != nil {
		_ = driver.Close(context.Background())
		return nil, err
	}

	return driver, nil
}
