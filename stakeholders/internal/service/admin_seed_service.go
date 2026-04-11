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

func NewAdminSeedService(userRepository repository.UserRepository) AdminSeedService {
	return &adminSeedService{userRepository: userRepository}
}

func (s *adminSeedService) SeedAdmins(ctx context.Context) error {
	const (
		adminUsername = "admin"
		adminEmail    = "admin@example.com"
		adminPassword = "admin"
	)

	existingUser, err := s.userRepository.FindByUsernameOrEmail(ctx, adminUsername, adminEmail)
	if err != nil {
		return err
	}
	if existingUser != nil {
		return nil
	}

	passwordHash, err := bcrypt.GenerateFromPassword([]byte(adminPassword), bcrypt.DefaultCost)
	if err != nil {
		return err
	}

	user := &domain.User{
		ID:           generateSeedID(),
		Username:     adminUsername,
		Email:        strings.ToLower(adminEmail),
		PasswordHash: string(passwordHash),
		FirstName:    "",
		LastName:     "",
		ProfileImage: "",
		Biography:    "",
		Motto:        "",
		Role:         domain.RoleAdmin,
		IsBlocked:    false,
		CreatedAt:    time.Now().UTC(),
	}

	if err := s.userRepository.Create(ctx, user); err != nil {
		return err
	}

	log.Printf("seeded admin user %s", adminUsername)
	return nil
}

func generateSeedID() string {
	buffer := make([]byte, 16)
	if _, err := rand.Read(buffer); err != nil {
		panic("failed to generate seed user id")
	}

	return hex.EncodeToString(buffer)
}
