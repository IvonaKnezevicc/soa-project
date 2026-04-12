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
  comments: CommentResponse[];
  likeCount: number;
  likedByCurrentUser: boolean;
}

export interface CreateCommentRequest {
  text: string;
}

export interface CommentResponse {
  id: string;
  postId: string;
  text: string;
  createdAt: string;
  updatedAt: string;
  authorUserId: string;
  authorUsername: string;
  authorEmail: string;
  authorRole: string;
}
