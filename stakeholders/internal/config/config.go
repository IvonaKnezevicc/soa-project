package config

import (
	"bufio"
	"errors"
	"os"
	"path/filepath"
	"strconv"
	"strings"
)

type Config struct {
	ServerPort           string
	Neo4jURI             string
	Neo4jUsername        string
	Neo4jPassword        string
	Neo4jDatabase        string
	PaymentServiceURL    string
	CORSAllowedOrigins   []string
	JWTSecret            string
	JWTIssuer            string
	JWTExpirationMinutes int
}

func Load() (*Config, error) {
	loadEnvFile(".env")

	cfg := &Config{
		ServerPort:           getEnv("SERVER_PORT", "8080"),
		Neo4jURI:             getEnv("NEO4J_URI", "neo4j://localhost:7687"),
		Neo4jUsername:        getEnv("NEO4J_USERNAME", ""),
		Neo4jPassword:        getEnv("NEO4J_PASSWORD", ""),
		Neo4jDatabase:        getEnv("NEO4J_DATABASE", "neo4j"),
		PaymentServiceURL:    getEnv("PAYMENT_SERVICE_URL", "http://localhost:8084"),
		CORSAllowedOrigins:   getEnvAsSlice("CORS_ALLOWED_ORIGINS", []string{"http://localhost:4200"}),
		JWTSecret:            getEnv("JWT_SECRET", ""),
		JWTIssuer:            getEnv("JWT_ISSUER", "stakeholders-service"),
		JWTExpirationMinutes: getEnvAsInt("JWT_EXPIRATION_MINUTES", 60),
	}

	if cfg.Neo4jUsername == "" || cfg.Neo4jPassword == "" {
		return nil, errors.New("NEO4J_USERNAME and NEO4J_PASSWORD must be set")
	}
	if cfg.JWTSecret == "" {
		return nil, errors.New("JWT_SECRET must be set")
	}

	return cfg, nil
}

func loadEnvFile(filename string) {
	file, err := os.Open(filepath.Clean(filename))
	if err != nil {
		return
	}
	defer file.Close()

	scanner := bufio.NewScanner(file)
	for scanner.Scan() {
		line := strings.TrimSpace(scanner.Text())
		if line == "" || strings.HasPrefix(line, "#") {
			continue
		}

		key, value, found := strings.Cut(line, "=")
		if !found {
			continue
		}

		key = strings.TrimSpace(key)
		value = strings.TrimSpace(value)
		if key == "" {
			continue
		}

		if _, exists := os.LookupEnv(key); !exists {
			_ = os.Setenv(key, value)
		}
	}
}

func getEnv(key, fallback string) string {
	value := strings.TrimSpace(os.Getenv(key))
	if value == "" {
		return fallback
	}

	return value
}

func getEnvAsInt(key string, fallback int) int {
	value := strings.TrimSpace(os.Getenv(key))
	if value == "" {
		return fallback
	}

	parsedValue, err := strconv.Atoi(value)
	if err != nil {
		return fallback
	}

	return parsedValue
}

func getEnvAsSlice(key string, fallback []string) []string {
	value := strings.TrimSpace(os.Getenv(key))
	if value == "" {
		return fallback
	}

	parts := strings.Split(value, ",")
	result := make([]string, 0, len(parts))
	for _, part := range parts {
		trimmed := strings.TrimSpace(part)
		if trimmed != "" {
			result = append(result, trimmed)
		}
	}

	if len(result) == 0 {
		return fallback
	}

	return result
}
