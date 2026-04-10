package apperror

import "errors"

var (
	ErrValidation         = errors.New("validation failed")
	ErrUserAlreadyExists  = errors.New("user already exists")
	ErrInvalidCredentials = errors.New("invalid credentials")
	ErrUserBlocked        = errors.New("user is blocked")
	ErrUnauthorized       = errors.New("unauthorized")
)
