package apperror

import "errors"

var (
	ErrValidation        = errors.New("validation failed")
	ErrUserAlreadyExists = errors.New("user already exists")
)
