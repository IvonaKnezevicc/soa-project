package dto

type UserProfileResponse struct {
	ID           string `json:"id"`
	Username     string `json:"username"`
	Email        string `json:"email"`
	Role         string `json:"role"`
	FirstName    string `json:"firstName"`
	LastName     string `json:"lastName"`
	ProfileImage string `json:"profileImage"`
	Biography    string `json:"biography"`
	Motto        string `json:"motto"`
}

type UpdateUserProfileRequest struct {
	FirstName    string `json:"firstName"`
	LastName     string `json:"lastName"`
	ProfileImage string `json:"profileImage"`
	Biography    string `json:"biography"`
	Motto        string `json:"motto"`
}
