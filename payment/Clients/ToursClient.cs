using System.Net.Http.Json;
using PaymentService.Services;

namespace PaymentService.Clients;

public class ToursClient(HttpClient httpClient, IConfiguration configuration) : IToursClient
{
    private readonly string toursServiceUrl = GetRequiredSetting(configuration, "TOURS_SERVICE_URL", "http://localhost:8083");

    public async Task<TourPurchaseInfo?> GetTourForPurchaseAsync(string tourId, CancellationToken cancellationToken)
    {
        var endpoint = $"{toursServiceUrl.TrimEnd('/')}/api/tours/internal/{Uri.EscapeDataString(tourId)}/purchase-info";
        using var response = await httpClient.GetAsync(endpoint, cancellationToken);
        if (!response.IsSuccessStatusCode)
        {
            return null;
        }

        return await response.Content.ReadFromJsonAsync<TourPurchaseInfo>(cancellationToken);
    }

    public async Task<bool> IsTourServiceReachableAsync(string tourId, CancellationToken cancellationToken)
    {
        var endpoint = $"{toursServiceUrl.TrimEnd('/')}/api/tours/internal/{Uri.EscapeDataString(tourId)}/purchase-info";
        using var response = await httpClient.GetAsync(endpoint, cancellationToken);
        return response.IsSuccessStatusCode;
    }

    private static string GetRequiredSetting(IConfiguration configuration, string key, string fallback)
    {
        var value = configuration[key];
        return string.IsNullOrWhiteSpace(value) ? fallback : value.Trim();
    }
}
