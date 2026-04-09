package auth

import "context"

type Identity struct {
	UserID   string
	Username string
	Email    string
	Role     string
}

type contextKey string

const identityContextKey contextKey = "authenticated-identity"

func WithIdentity(ctx context.Context, identity Identity) context.Context {
	return context.WithValue(ctx, identityContextKey, identity)
}

func IdentityFromContext(ctx context.Context) (Identity, bool) {
	identity, ok := ctx.Value(identityContextKey).(Identity)
	return identity, ok
}
