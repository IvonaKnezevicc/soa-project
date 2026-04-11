export interface BlogStartupStatus {
  service: string;
  status: string;
}

export interface CreateBlogPostRequest {
  title: string;
  descriptionMarkdown: string;
  imageUrls: string[];
}

export interface BlogPostResponse {
  id: string;
  title: string;
  descriptionMarkdown: string;
  descriptionHtml: string;
  imageUrls: string[];
  createdAt: string;
  authorUsername: string;
}
