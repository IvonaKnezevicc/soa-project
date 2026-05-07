using System.Net.Http.Headers;
using System.Net.Http.Json;
using PaymentService.Services;

namespace PaymentService.Clients;

public class StakeholdersClient(HttpClient httpClient, IConfiguration configuration) : IStakeholdersClient
{
    private readonly string stakeholdersServiceUrl = GetRequiredSetting(configuration, "STAKEHOLDERS_SERVICE_URL", "http://localhost:8080");

    public async Task<AuthenticatedIdentity?> ResolveIdentityAsync(HttpContext context, CancellationToken cancellationToken)
    {
        var token = TryGetBearerToken(context);
        if (string.IsNullOrWhiteSpace(token))
        {
            return null;
        }

        var endpoint = $"{stakeholdersServiceUrl.TrimEnd('/')}/api/stakeholders/users/me";
        using var request = new HttpRequestMessage(HttpMethod.Get, endpoint);
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);

        using var response = await httpClient.SendAsync(request, cancellationToken);
        if (!response.IsSuccessStatusCode)
        {
            return null;
        }

        var payload = await response.Content.ReadFromJsonAsync<StakeholdersMeResponse>(cancellationToken);
        if (payload is null
            || string.IsNullOrWhiteSpace(payload.Id)
            || string.IsNullOrWhiteSpace(payload.Username)
            || string.IsNullOrWhiteSpace(payload.Role))
        {
            return null;
        }

        return new AuthenticatedIdentity(payload.Id, payload.Username, payload.Role);
    }

    private static string? TryGetBearerToken(HttpContext context)
    {
        var header = context.Request.Headers.Authorization.ToString().Trim();
        if (string.IsNullOrWhiteSpace(header) || !header.StartsWith("Bearer ", StringComparison.OrdinalIgnoreCase))
        {
            return null;
        }

        var token = header["Bearer ".Length..].Trim();
        return string.IsNullOrWhiteSpace(token) ? null : token;
    }

    private static string GetRequiredSetting(IConfiguration configuration, string key, string fallback)
    {
        var value = configuration[key];
        return string.IsNullOrWhiteSpace(value) ? fallback : value.Trim();
    }

    private sealed record StakeholdersMeResponse(string Id, string Username, string Email, string Role);
}
