package dto

type UserRegistrationRequest struct {
	Username string `json:"username"`
	Email    string `json:"email"`
	Password string `json:"password"`
	Role     string `json:"role"`
}

type UserRegistrationResponse struct {
	ID        string `json:"id"`
	Username  string `json:"username"`
	Email     string `json:"email"`
	Role      string `json:"role"`
	IsBlocked bool   `json:"isBlocked"`
	CreatedAt string `json:"createdAt"`
}

type ErrorResponse struct {
	Message string `json:"message"`
}
