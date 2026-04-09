package service

import (
	"errors"
	"time"

	"github.com/golang-jwt/jwt/v5"

	"soa-project/stakeholders/internal/apperror"
	"soa-project/stakeholders/internal/auth"
	"soa-project/stakeholders/internal/config"
	"soa-project/stakeholders/internal/domain"
)

type TokenDetails struct {
	AccessToken string
	ExpiresIn   int
}

type JWTService interface {
	GenerateToken(user *domain.User) (*TokenDetails, error)
	ValidateToken(token string) (auth.Identity, error)
}

type jwtService struct {
	secretKey         []byte
	issuer            string
	expirationMinutes int
}

func NewJWTService(cfg *config.Config) JWTService {
	return &jwtService{
		secretKey:         []byte(cfg.JWTSecret),
		issuer:            cfg.JWTIssuer,
		expirationMinutes: cfg.JWTExpirationMinutes,
	}
}

func (s *jwtService) GenerateToken(user *domain.User) (*TokenDetails, error) {
	now := time.Now().UTC()
	expiresAt := now.Add(time.Duration(s.expirationMinutes) * time.Minute)

	claims := jwt.MapClaims{
		"sub":      user.ID,
		"username": user.Username,
		"email":    user.Email,
		"role":     user.Role,
		"iss":      s.issuer,
		"iat":      now.Unix(),
		"exp":      expiresAt.Unix(),
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	signedToken, err := token.SignedString(s.secretKey)
	if err != nil {
		return nil, err
	}

	return &TokenDetails{
		AccessToken: signedToken,
		ExpiresIn:   s.expirationMinutes * 60,
	}, nil
}

func (s *jwtService) ValidateToken(token string) (auth.Identity, error) {
	parsedToken, err := jwt.Parse(token, func(token *jwt.Token) (any, error) {
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, errors.New("unexpected signing method")
		}

		return s.secretKey, nil
	})
	if err != nil || !parsedToken.Valid {
		return auth.Identity{}, apperror.ErrUnauthorized
	}

	claims, ok := parsedToken.Claims.(jwt.MapClaims)
	if !ok {
		return auth.Identity{}, apperror.ErrUnauthorized
	}

	issuer, _ := claims["iss"].(string)
	if issuer != s.issuer {
		return auth.Identity{}, apperror.ErrUnauthorized
	}

	identity := auth.Identity{
		UserID:   stringClaim(claims, "sub"),
		Username: stringClaim(claims, "username"),
		Email:    stringClaim(claims, "email"),
		Role:     stringClaim(claims, "role"),
	}
	if identity.UserID == "" || identity.Role == "" {
		return auth.Identity{}, apperror.ErrUnauthorized
	}

	return identity, nil
}

func stringClaim(claims jwt.MapClaims, key string) string {
	value, ok := claims[key].(string)
	if !ok {
		return ""
	}
	return value
}
