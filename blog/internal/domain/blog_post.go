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
}
