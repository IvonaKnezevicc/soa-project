package main

import (
	"context"
	"log"
	"net/http"
	"time"

	"soa-project/blog/internal/config"
	"soa-project/blog/internal/controller"
	"soa-project/blog/internal/middleware"
	"soa-project/blog/internal/repository"
	"soa-project/blog/internal/server"
	"soa-project/blog/internal/service"
)

func main() {
	cfg, err := config.Load()
	if err != nil {
		log.Fatalf("failed to load config: %v", err)
	}

	driver, err := repository.NewNeo4jDriver(cfg)
	if err != nil {
		log.Fatalf("failed to connect to neo4j: %v", err)
	}
	defer func() {
		if closeErr := driver.Close(context.Background()); closeErr != nil {
			log.Printf("failed to close neo4j driver: %v", closeErr)
		}
	}()

	blogPostRepository := repository.NewNeo4jBlogPostRepository(driver, cfg.Neo4jDatabase)
	if err := blogPostRepository.EnsureConstraints(context.Background()); err != nil {
		log.Fatalf("failed to ensure neo4j constraints: %v", err)
	}

	jwtService := service.NewJWTService(cfg)
	followerClient := service.NewFollowerClient(cfg.FollowerServiceURL)
	blogPostService := service.NewBlogPostService(blogPostRepository, followerClient)
	startupController := controller.NewStartupController()
	blogPostController := controller.NewBlogPostController(blogPostService)
	authMiddleware := middleware.NewAuthMiddleware(jwtService)
	corsMiddleware := middleware.NewCORSMiddleware(cfg.CORSAllowedOrigins)

	httpServer := &http.Server{
		Addr:              ":" + cfg.ServerPort,
		Handler:           server.NewRouter(startupController, blogPostController, authMiddleware, corsMiddleware),
		ReadHeaderTimeout: 5 * time.Second,
	}

	log.Printf("blog server listening on port %s", cfg.ServerPort)
	if err := httpServer.ListenAndServe(); err != nil && err != http.ErrServerClosed {
		log.Fatalf("server stopped with error: %v", err)
	}
}
