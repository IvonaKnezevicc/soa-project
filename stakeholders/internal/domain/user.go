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
	FirstName    string
	LastName     string
	ProfileImage string
	Biography    string
	Motto        string
	Role         string
	IsBlocked    bool
	CreatedAt    time.Time
	BlockedAt    *time.Time
}
