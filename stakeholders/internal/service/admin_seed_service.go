package service

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"log"
	"strings"
	"time"

	"golang.org/x/crypto/bcrypt"

	"soa-project/stakeholders/internal/domain"
	"soa-project/stakeholders/internal/repository"
)

type AdminSeedService interface {
	SeedAdmins(ctx context.Context) error
}

type adminSeedService struct {
	userRepository repository.UserRepository
}

type adminSeed struct {
	username string
	email    string
	password string
}

func NewAdminSeedService(userRepository repository.UserRepository) AdminSeedService {
	return &adminSeedService{userRepository: userRepository}
}

func (s *adminSeedService) SeedAdmins(ctx context.Context) error {
	admins := []adminSeed{
		{username: "admin1", email: "admin1@example.com", password: "Admin1234"},
		{username: "admin2", email: "admin2@example.com", password: "Admin1234"},
		{username: "admin3", email: "admin3@example.com", password: "Admin1234"},
	}

	for _, admin := range admins {
		existingUser, err := s.userRepository.FindByUsernameOrEmail(ctx, admin.username, admin.email)
		if err != nil {
			return err
		}
		if existingUser != nil {
			continue
		}

		passwordHash, err := bcrypt.GenerateFromPassword([]byte(admin.password), bcrypt.DefaultCost)
		if err != nil {
			return err
		}

		user := &domain.User{
			ID:           generateSeedID(),
			Username:     admin.username,
			Email:        strings.ToLower(admin.email),
			PasswordHash: string(passwordHash),
			Role:         domain.RoleAdmin,
			IsBlocked:    false,
			CreatedAt:    time.Now().UTC(),
		}

		if err := s.userRepository.Create(ctx, user); err != nil {
			return err
		}

		log.Printf("seeded admin user %s", admin.username)
	}

	return nil
}

func generateSeedID() string {
	buffer := make([]byte, 16)
	if _, err := rand.Read(buffer); err != nil {
		panic("failed to generate seed user id")
	}

	return hex.EncodeToString(buffer)
}
