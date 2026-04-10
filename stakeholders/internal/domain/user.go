package domain

import "time"

const (
	RoleGuide   = "guide"
	RoleTourist = "tourist"
	RoleAdmin   = "admin"
)

type User struct {
	ID           string
	Username     string
	Email        string
	PasswordHash string
	Role         string
	IsBlocked    bool
	CreatedAt    time.Time
	BlockedAt    *time.Time
}
