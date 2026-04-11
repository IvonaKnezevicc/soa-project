package dto

type CreateBlogPostRequest struct {
	Title               string   `json:"title"`
	DescriptionMarkdown string   `json:"descriptionMarkdown"`
	ImageURLs           []string `json:"imageUrls"`
}

type BlogPostResponse struct {
	ID                  string   `json:"id"`
	Title               string   `json:"title"`
	DescriptionMarkdown string   `json:"descriptionMarkdown"`
	DescriptionHTML     string   `json:"descriptionHtml"`
	ImageURLs           []string `json:"imageUrls"`
	CreatedAt           string   `json:"createdAt"`
	AuthorUsername      string   `json:"authorUsername"`
	Comments            []CommentResponse `json:"comments"`
}

type CreateCommentRequest struct {
	Text string `json:"text"`
}

type CommentResponse struct {
	ID             string `json:"id"`
	PostID         string `json:"postId"`
	Text           string `json:"text"`
	CreatedAt      string `json:"createdAt"`
	UpdatedAt      string `json:"updatedAt"`
	AuthorUserID   string `json:"authorUserId"`
	AuthorUsername string `json:"authorUsername"`
	AuthorEmail    string `json:"authorEmail"`
	AuthorRole     string `json:"authorRole"`
}

type ErrorResponse struct {
	Message string `json:"message"`
}
