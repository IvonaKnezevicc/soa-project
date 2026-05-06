using Microsoft.EntityFrameworkCore;
using PaymentService;
using PaymentService.Clients;
using PaymentService.Common;
using PaymentService.Repositories;
using PaymentService.Services;

var builder = WebApplication.CreateBuilder(args);

var serverPort = GetSetting(builder.Configuration, "SERVER_PORT", "8084");
var connectionString = GetSetting(builder.Configuration, "POSTGRES_CONNECTION_STRING", "Host=localhost;Port=5432;Database=paymentdb;Username=postgres;Password=postgres");
var allowedOrigins = GetSetting(builder.Configuration, "CORS_ALLOWED_ORIGINS", "http://localhost:4200")
    .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);

builder.Services.AddDbContext<PaymentDbContext>(options => options.UseNpgsql(connectionString));
builder.Services.AddControllers();
builder.Services.AddHttpClient<IStakeholdersClient, StakeholdersClient>(client => client.Timeout = TimeSpan.FromSeconds(8));
builder.Services.AddHttpClient<IToursClient, ToursClient>(client => client.Timeout = TimeSpan.FromSeconds(8));
builder.Services.AddScoped<IPaymentRepository, PaymentRepository>();
builder.Services.AddScoped<IPaymentCartService, PaymentCartService>();
builder.Services.AddScoped<IWalletService, WalletService>();
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

app.UseMiddleware<ApiExceptionMiddleware>();
app.UseCors();
app.MapControllers();

await using (var scope = app.Services.CreateAsyncScope())
{
    var dbContext = scope.ServiceProvider.GetRequiredService<PaymentDbContext>();
    await dbContext.Database.EnsureCreatedAsync();
    await dbContext.Database.ExecuteSqlRawAsync("""
        CREATE TABLE IF NOT EXISTS wallets (
            "Id" uuid NOT NULL PRIMARY KEY,
            "TouristId" character varying(100) NOT NULL,
            "Balance" numeric(18,2) NOT NULL,
            "CreatedAt" timestamp with time zone NOT NULL,
            "UpdatedAt" timestamp with time zone NOT NULL
        );
        CREATE UNIQUE INDEX IF NOT EXISTS "IX_wallets_TouristId" ON wallets ("TouristId");
        """);
}

await app.RunAsync();

static string GetSetting(IConfiguration configuration, string key, string fallback)
{
    var value = configuration[key];
    return string.IsNullOrWhiteSpace(value) ? fallback : value.Trim();
}
