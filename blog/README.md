# Blog Service (Startup)

## Prerequisites
- Go installed
- Docker Desktop running

## 1) Start blog database
```powershell
docker compose up -d
```

## 2) Run blog backend
```powershell
go run .\main
```

Backend runs on `http://localhost:8081`.

## 3) Health check
```powershell
curl http://localhost:8081/health
```

Expected response includes:
- `service: blog`
- `status: ok`

## 4) Create blog post (requires logged-in user token)
Endpoint:
- `POST http://localhost:8081/api/blog/posts`

Request body:
```json
{
  "title": "My first blog",
  "descriptionMarkdown": "## Hello\nThis is **markdown** content.",
  "imageUrls": ["https://example.com/image-1.jpg"]
}
```
