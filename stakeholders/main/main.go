package main

import (
	"context"
	"log"
	"net/http"
	"time"

	"soa-project/stakeholders/internal/config"
	"soa-project/stakeholders/internal/controller"
	"soa-project/stakeholders/internal/middleware"
	"soa-project/stakeholders/internal/repository"
	"soa-project/stakeholders/internal/server"
	"soa-project/stakeholders/internal/service"
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

	userRepository := repository.NewNeo4jUserRepository(driver, cfg.Neo4jDatabase)
	if err := userRepository.EnsureConstraints(context.Background()); err != nil {
		log.Fatalf("failed to ensure neo4j constraints: %v", err)
	}
	adminSeedService := service.NewAdminSeedService(userRepository)
	if err := adminSeedService.SeedAdmins(context.Background()); err != nil {
		log.Fatalf("failed to seed admin users: %v", err)
	}

	jwtService := service.NewJWTService(cfg)
	paymentClient := service.NewPaymentClient(cfg.PaymentServiceURL)
	registrationService := service.NewUserRegistrationService(userRepository, paymentClient)
	loginService := service.NewUserLoginService(userRepository, jwtService)
	userListService := service.NewUserListService(userRepository)
	userBlockService := service.NewUserBlockService(userRepository)
	userProfileService := service.NewUserProfileService(userRepository)
	userController := controller.NewUserController(
		registrationService,
		loginService,
		userListService,
		userBlockService,
		userProfileService,
	)
	authMiddleware := middleware.NewAuthMiddleware(jwtService)
	roleMiddleware := middleware.NewRoleMiddleware()
	corsMiddleware := middleware.NewCORSMiddleware(cfg.CORSAllowedOrigins)

	httpServer := &http.Server{
		Addr:              ":" + cfg.ServerPort,
		Handler:           server.NewRouter(userController, authMiddleware, roleMiddleware, corsMiddleware),
		ReadHeaderTimeout: 5 * time.Second,
	}

	log.Printf("stakeholders server listening on port %s", cfg.ServerPort)
	if err := httpServer.ListenAndServe(); err != nil && err != http.ErrServerClosed {
		log.Fatalf("server stopped with error: %v", err)
	}
}
