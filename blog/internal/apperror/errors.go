package apperror

import "errors"

var (
	ErrValidation   = errors.New("validation failed")
	ErrUnauthorized = errors.New("unauthorized")
)
