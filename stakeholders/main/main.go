package main

import (
	"context"
	"log/slog"
	"net/http"
	"os"
	"time"

	"soa-project/stakeholders/internal/config"
	"soa-project/stakeholders/internal/controller"
	"soa-project/stakeholders/internal/middleware"
	"soa-project/stakeholders/internal/observability"
	"soa-project/stakeholders/internal/repository"
	"soa-project/stakeholders/internal/server"
	"soa-project/stakeholders/internal/service"
)

func main() {
	cfg, err := config.Load()
	if err != nil {
		panic(err)
	}

	observability.ConfigureLogger(cfg.OTELServiceName)

	shutdownTracing, err := observability.InitTracing(context.Background(), cfg.OTELServiceName, cfg.OTELEndpoint)
	if err != nil {
		slog.Error("failed to initialize tracing", "traceId", "", "message", err.Error())
	} else {
		defer func() {
			shutdownCtx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
			defer cancel()
			if tracingErr := shutdownTracing(shutdownCtx); tracingErr != nil {
				slog.Error("failed to shut down tracing", "traceId", "", "message", tracingErr.Error())
			}
		}()
	}

	driver, err := repository.NewNeo4jDriver(cfg)
	if err != nil {
		slog.Error("failed to connect to neo4j", "traceId", "", "message", err.Error())
		os.Exit(1)
	}
	defer func() {
		if closeErr := driver.Close(context.Background()); closeErr != nil {
			slog.Error("failed to close neo4j driver", "traceId", "", "message", closeErr.Error())
		}
	}()

	userRepository := repository.NewNeo4jUserRepository(driver, cfg.Neo4jDatabase)
	if err := userRepository.EnsureConstraints(context.Background()); err != nil {
		slog.Error("failed to ensure neo4j constraints", "traceId", "", "message", err.Error())
		os.Exit(1)
	}
	adminSeedService := service.NewAdminSeedService(userRepository)
	if err := adminSeedService.SeedAdmins(context.Background()); err != nil {
		slog.Error("failed to seed admin users", "traceId", "", "message", err.Error())
		os.Exit(1)
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

	slog.Info("stakeholders server listening", "traceId", "", "port", cfg.ServerPort)
	if err := httpServer.ListenAndServe(); err != nil && err != http.ErrServerClosed {
		slog.Error("stakeholders server stopped with error", "traceId", "", "message", err.Error())
		os.Exit(1)
	}
}
