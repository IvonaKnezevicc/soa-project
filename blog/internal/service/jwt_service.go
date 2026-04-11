package service

import (
	"errors"

	"github.com/golang-jwt/jwt/v5"

	"soa-project/blog/internal/apperror"
	"soa-project/blog/internal/auth"
	"soa-project/blog/internal/config"
)

type JWTService interface {
	ValidateToken(token string) (auth.Identity, error)
}

type jwtService struct {
	secretKey []byte
	issuer    string
}

func NewJWTService(cfg *config.Config) JWTService {
	return &jwtService{
		secretKey: []byte(cfg.JWTSecret),
		issuer:    cfg.JWTIssuer,
	}
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
	if identity.UserID == "" || identity.Username == "" || identity.Role == "" {
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
