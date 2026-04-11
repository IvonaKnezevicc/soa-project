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
}

type ErrorResponse struct {
	Message string `json:"message"`
}
