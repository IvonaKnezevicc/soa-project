package dto

type UserListItem struct {
	Username  string `json:"username"`
	Email     string `json:"email"`
	Role      string `json:"role"`
	IsBlocked bool   `json:"isBlocked"`
	CreatedAt string `json:"createdAt"`
	BlockedAt string `json:"blockedAt"`
}

type PagedUsersResponse struct {
	Items      []UserListItem `json:"items"`
	Page       int            `json:"page"`
	PageSize   int            `json:"pageSize"`
	TotalCount int            `json:"totalCount"`
	TotalPages int            `json:"totalPages"`
	Status     string         `json:"status"`
}
