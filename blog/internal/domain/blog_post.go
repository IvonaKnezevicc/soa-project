package domain

import "time"

type BlogPost struct {
	ID                  string
	Title               string
	DescriptionMarkdown string
	DescriptionHTML     string
	ImageURLs           []string
	CreatedAt           time.Time
	AuthorUsername      string
	AuthorRole          string
	Comments            []Comment
}

type Comment struct {
	ID             string
	PostID         string
	Text           string
	CreatedAt      time.Time
	UpdatedAt      time.Time
	AuthorUserID   string
	AuthorUsername string
	AuthorEmail    string
	AuthorRole     string
}
