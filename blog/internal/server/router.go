package server

import (
	"net/http"
	"strings"

	"soa-project/blog/internal/controller"
	"soa-project/blog/internal/middleware"
)

func NewRouter(
	startupController *controller.StartupController,
	blogPostController *controller.BlogPostController,
	authMiddleware *middleware.AuthMiddleware,
	corsMiddleware *middleware.CORSMiddleware,
) http.Handler {
	mux := http.NewServeMux()
	mux.HandleFunc("/health", startupController.Health)
	mux.HandleFunc("/api/blog/startup", startupController.StartupInfo)
	mux.HandleFunc("/api/blog/posts", authMiddleware.RequireAuth(func(w http.ResponseWriter, r *http.Request) {
		switch r.Method {
		case http.MethodGet:
			blogPostController.GetBlogPosts(w, r)
		case http.MethodPost:
			blogPostController.CreateBlogPost(w, r)
		default:
			w.WriteHeader(http.StatusMethodNotAllowed)
		}
	}))
	mux.HandleFunc("/api/blog/posts/", authMiddleware.RequireAuth(func(w http.ResponseWriter, r *http.Request) {
		if r.Method == http.MethodPost && strings.HasSuffix(r.URL.Path, "/comments") {
			blogPostController.CreateComment(w, r)
			return
		}

		w.WriteHeader(http.StatusMethodNotAllowed)
	}))

	return corsMiddleware.Handler(mux)
}
