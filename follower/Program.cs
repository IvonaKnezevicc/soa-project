using Neo4j.Driver;

var builder = WebApplication.CreateBuilder(args);

var serverPort = GetEnv("SERVER_PORT", "8082");
var neo4jUri = GetEnv("NEO4J_URI", "neo4j://localhost:7689");
var neo4jUsername = GetEnv("NEO4J_USERNAME", "neo4j");
var neo4jPassword = GetEnv("NEO4J_PASSWORD", "password123");
var neo4jDatabase = GetEnv("NEO4J_DATABASE", "neo4j");
var stakeholdersServiceUrl = GetEnv("STAKEHOLDERS_SERVICE_URL", "http://localhost:8080");
var allowedOrigins = GetEnv("CORS_ALLOWED_ORIGINS", "http://localhost:4200")
    .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);

var driver = GraphDatabase.Driver(neo4jUri, AuthTokens.Basic(neo4jUsername, neo4jPassword));
await EnsureConstraints(driver, neo4jDatabase);

builder.Services.AddSingleton(driver);
builder.Services.AddSingleton(new HttpClient
{
    Timeout = TimeSpan.FromSeconds(5)
});

builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
    {
        policy.WithOrigins(allowedOrigins)
            .AllowAnyHeader()
            .AllowAnyMethod();
    });
});

builder.WebHost.UseUrls($"http://0.0.0.0:{serverPort}");

var app = builder.Build();

app.UseCors();

app.MapGet("/health", () => Results.Ok(new { service = "follower", status = "ok" }));

app.MapPost("/api/followers/follows/{targetUsername}", async (HttpContext context, string targetUsername, IDriver neo4j, HttpClient httpClient) =>
{
    var token = TryGetBearerToken(context);
    if (string.IsNullOrWhiteSpace(token))
    {
        return Results.Unauthorized();
    }

    var identity = await ResolveIdentityFromStakeholdersAsync(context, httpClient, stakeholdersServiceUrl);
    if (identity is null)
    {
        return Results.Unauthorized();
    }

    targetUsername = targetUsername.Trim();
    if (string.IsNullOrWhiteSpace(targetUsername))
    {
        return Results.BadRequest(new ErrorResponse("target username is required"));
    }

    if (string.Equals(identity.Username, targetUsername, StringComparison.OrdinalIgnoreCase))
    {
        return Results.BadRequest(new ErrorResponse("you cannot follow yourself"));
    }

    var targetExists = await CheckStakeholdersUserExistsAsync(httpClient, stakeholdersServiceUrl, token, targetUsername);
    if (!targetExists)
    {
        return Results.NotFound(new ErrorResponse($"user '{targetUsername}' does not exist"));
    }

    await using (var readSession = neo4j.AsyncSession(config => config.WithDatabase(neo4jDatabase)))
    {
        var alreadyFollowing = await readSession.ExecuteReadAsync(async tx =>
        {
            var cursor = await tx.RunAsync(@"
                MATCH (:User {username: $followerUsername})-[r:FOLLOWS]->(:User {username: $targetUsername})
                RETURN count(r) > 0 AS alreadyFollowing",
                new
                {
                    followerUsername = identity.Username,
                    targetUsername
                });

            if (await cursor.FetchAsync())
            {
                return cursor.Current["alreadyFollowing"].As<bool>();
            }

            return false;
        });

        if (alreadyFollowing)
        {
            return Results.Conflict(new ErrorResponse($"you already follow '{targetUsername}'"));
        }
    }

    await using var session = neo4j.AsyncSession(config => config.WithDatabase(neo4jDatabase));
    await session.ExecuteWriteAsync(async tx =>
    {
        await tx.RunAsync(@"
            MERGE (follower:User {username: $followerUsername})
            ON CREATE SET follower.id = $followerId, follower.createdAt = datetime()
            SET follower.lastSeenAt = datetime()
            MERGE (target:User {username: $targetUsername})
            ON CREATE SET target.createdAt = datetime()
            SET target.lastSeenAt = datetime()
            MERGE (follower)-[r:FOLLOWS]->(target)
            ON CREATE SET r.createdAt = datetime()",
            new
            {
                followerUsername = identity.Username,
                followerId = identity.UserId,
                targetUsername
            });
    });

    return Results.Ok(new { message = "followed" });
});

app.MapGet("/api/followers/follows", async (HttpContext context, IDriver neo4j, HttpClient httpClient) =>
{
    var identity = await ResolveIdentityFromStakeholdersAsync(context, httpClient, stakeholdersServiceUrl);
    if (identity is null)
    {
        return Results.Unauthorized();
    }

    await EnsureUserNode(identity, neo4j, neo4jDatabase);

    await using var session = neo4j.AsyncSession(config => config.WithDatabase(neo4jDatabase));
    var usernames = await session.ExecuteReadAsync(async tx =>
    {
        var cursor = await tx.RunAsync(@"
            MATCH (:User {username: $username})-[:FOLLOWS]->(target:User)
            RETURN target.username AS username
            ORDER BY target.username ASC",
            new { username = identity.Username });

        var items = new List<string>();
        while (await cursor.FetchAsync())
        {
            var username = cursor.Current["username"].As<string>();
            items.Add(username);
        }

        return items;
    });

    return Results.Ok(new FollowingResponse(usernames));
});

app.MapGet("/api/followers/recommendations", async (HttpContext context, IDriver neo4j, HttpClient httpClient) =>
{
    var token = TryGetBearerToken(context);
    if (string.IsNullOrWhiteSpace(token))
    {
        return Results.Unauthorized();
    }

    var identity = await ResolveIdentityFromStakeholdersAsync(context, httpClient, stakeholdersServiceUrl);
    if (identity is null)
    {
        return Results.Unauthorized();
    }

    await EnsureUserNode(identity, neo4j, neo4jDatabase);

    await using var session = neo4j.AsyncSession(config => config.WithDatabase(neo4jDatabase));
    var recommendations = await session.ExecuteReadAsync(async tx =>
    {
        var cursor = await tx.RunAsync(@"
            MATCH (me:User {username: $username})-[:FOLLOWS]->(:User)-[:FOLLOWS]->(candidate:User)
            WHERE candidate.username <> $username
              AND NOT (me)-[:FOLLOWS]->(candidate)
            RETURN candidate.username AS username, count(*) AS mutualConnections
            ORDER BY mutualConnections DESC, username ASC
            LIMIT 20",
            new { username = identity.Username });

        var items = new List<RecommendationResponseItem>();
        while (await cursor.FetchAsync())
        {
            items.Add(new RecommendationResponseItem(
                cursor.Current["username"].As<string>(),
                cursor.Current["mutualConnections"].As<long>()));
        }

        return items;
    });

    var filteredRecommendations = new List<RecommendationResponseItem>();
    foreach (var item in recommendations)
    {
        var exists = await CheckStakeholdersUserExistsAsync(httpClient, stakeholdersServiceUrl, token, item.Username);
        if (exists)
        {
            filteredRecommendations.Add(item);
        }
    }

    return Results.Ok(new RecommendationsResponse(filteredRecommendations));
});

app.MapGet("/api/followers/internal/can-comment", async (string followerUsername, string authorUsername, IDriver neo4j) =>
{
    followerUsername = followerUsername.Trim();
    authorUsername = authorUsername.Trim();

    if (string.IsNullOrWhiteSpace(followerUsername) || string.IsNullOrWhiteSpace(authorUsername))
    {
        return Results.BadRequest(new ErrorResponse("followerUsername and authorUsername are required"));
    }

    if (string.Equals(followerUsername, authorUsername, StringComparison.OrdinalIgnoreCase))
    {
        return Results.Ok(new CanCommentResponse(true));
    }

    await using var session = neo4j.AsyncSession(config => config.WithDatabase(neo4jDatabase));
    var canComment = await session.ExecuteReadAsync(async tx =>
    {
        var cursor = await tx.RunAsync(@"
            MATCH (follower:User {username: $followerUsername})-[r:FOLLOWS]->(author:User {username: $authorUsername})
            RETURN count(r) > 0 AS canComment",
            new { followerUsername, authorUsername });

        if (await cursor.FetchAsync())
        {
            return cursor.Current["canComment"].As<bool>();
        }

        return false;
    });

    return Results.Ok(new CanCommentResponse(canComment));
});

app.MapGet("/api/followers/internal/allowed-authors", async (string username, IDriver neo4j) =>
{
    username = username.Trim();
    if (string.IsNullOrWhiteSpace(username))
    {
        return Results.BadRequest(new ErrorResponse("username is required"));
    }

    await using var session = neo4j.AsyncSession(config => config.WithDatabase(neo4jDatabase));
    var authors = await session.ExecuteReadAsync(async tx =>
    {
        var cursor = await tx.RunAsync(@"
            MATCH (:User {username: $username})-[:FOLLOWS]->(target:User)
            RETURN target.username AS username",
            new { username });

        var items = new List<string>();
        while (await cursor.FetchAsync())
        {
            items.Add(cursor.Current["username"].As<string>());
        }

        return items;
    });

    return Results.Ok(new AllowedAuthorsResponse(authors));
});

app.Lifetime.ApplicationStopping.Register(() =>
{
    driver.Dispose();
});

await app.RunAsync();

static async Task EnsureConstraints(IDriver driver, string database)
{
    await using var session = driver.AsyncSession(config => config.WithDatabase(database));
    await session.ExecuteWriteAsync(async tx =>
    {
        await tx.RunAsync("CREATE CONSTRAINT follower_user_username_unique IF NOT EXISTS FOR (u:User) REQUIRE u.username IS UNIQUE");
    });
}

static async Task EnsureUserNode(AuthenticatedIdentity identity, IDriver driver, string database)
{
    await using var session = driver.AsyncSession(config => config.WithDatabase(database));
    await session.ExecuteWriteAsync(async tx =>
    {
        await tx.RunAsync(@"
            MERGE (u:User {username: $username})
            ON CREATE SET u.id = $id, u.createdAt = datetime()
            SET u.lastSeenAt = datetime()",
            new { username = identity.Username, id = identity.UserId });
    });
}

static string GetEnv(string key, string fallback)
{
    var value = Environment.GetEnvironmentVariable(key);
    return string.IsNullOrWhiteSpace(value) ? fallback : value.Trim();
}

static async Task<AuthenticatedIdentity?> ResolveIdentityFromStakeholdersAsync(
    HttpContext context,
    HttpClient httpClient,
    string stakeholdersServiceUrl)
{
    var token = TryGetBearerToken(context);
    if (string.IsNullOrWhiteSpace(token))
    {
        return null;
    }

    var endpoint = $"{stakeholdersServiceUrl.TrimEnd('/')}/api/stakeholders/users/me";
    using var request = new HttpRequestMessage(HttpMethod.Get, endpoint);
    request.Headers.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", token);

    using var response = await httpClient.SendAsync(request);
    if (!response.IsSuccessStatusCode)
    {
        return null;
    }

    var payload = await response.Content.ReadFromJsonAsync<StakeholdersMeResponse>();
    if (payload is null || string.IsNullOrWhiteSpace(payload.Id) || string.IsNullOrWhiteSpace(payload.Username) || string.IsNullOrWhiteSpace(payload.Role))
    {
        return null;
    }

    return new AuthenticatedIdentity(payload.Id, payload.Username, payload.Role);
}

static async Task<bool> CheckStakeholdersUserExistsAsync(
    HttpClient httpClient,
    string stakeholdersServiceUrl,
    string token,
    string username)
{
    var endpoint = $"{stakeholdersServiceUrl.TrimEnd('/')}/api/stakeholders/users/exists?username={Uri.EscapeDataString(username)}";
    using var request = new HttpRequestMessage(HttpMethod.Get, endpoint);
    request.Headers.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", token);

    using var response = await httpClient.SendAsync(request);
    if (!response.IsSuccessStatusCode)
    {
        return false;
    }

    var payload = await response.Content.ReadFromJsonAsync<StakeholdersExistsResponse>();
    return payload is not null && payload.Exists;
}

static string? TryGetBearerToken(HttpContext context)
{
    var header = context.Request.Headers.Authorization.ToString().Trim();
    if (string.IsNullOrWhiteSpace(header) || !header.StartsWith("Bearer ", StringComparison.OrdinalIgnoreCase))
    {
        return null;
    }

    var token = header["Bearer ".Length..].Trim();
    return string.IsNullOrWhiteSpace(token) ? null : token;
}

record AuthenticatedIdentity(string UserId, string Username, string Role);
record StakeholdersMeResponse(string Id, string Username, string Email, string Role);
record StakeholdersExistsResponse(string Username, bool Exists);
record ErrorResponse(string Message);
record FollowingResponse(IReadOnlyList<string> Usernames);
record RecommendationResponseItem(string Username, long MutualConnections);
record RecommendationsResponse(IReadOnlyList<RecommendationResponseItem> Items);
record CanCommentResponse(bool CanComment);
record AllowedAuthorsResponse(IReadOnlyList<string> Usernames);
