using System.Globalization;
using System.Net.Http.Json;
using Grpc.Net.Client;
using PaymentService.Grpc;
using PaymentService.Services;

namespace PaymentService.Clients;

public class ToursClient(HttpClient httpClient, IConfiguration configuration) : IToursClient
{
    private readonly string toursServiceUrl = GetRequiredSetting(configuration, "TOURS_SERVICE_URL", "http://localhost:8083");
    private readonly string toursGrpcUrl = GetRequiredSetting(configuration, "TOURS_GRPC_URL", "http://tours:9093");
    private readonly ToursRpcService.ToursRpcServiceClient grpcClient = CreateGrpcClient(GetRequiredSetting(configuration, "TOURS_GRPC_URL", "http://tours:9093"));

    public async Task<TourPurchaseInfo?> GetTourForPurchaseAsync(string tourId, CancellationToken cancellationToken)
    {
        var response = await grpcClient.GetToursForPurchaseAsync(new GetToursForPurchaseRequest
        {
            TourIds = { tourId }
        }, cancellationToken: cancellationToken);

        var tour = response.Tours.SingleOrDefault();
        if (tour is null || !tour.Exists)
        {
            return null;
        }

        return new TourPurchaseInfo(
            tour.Id,
            tour.Name,
            decimal.TryParse(tour.Price, NumberStyles.Number, CultureInfo.InvariantCulture, out var price) ? price : 0m,
            tour.Status);
    }

    public async Task<IReadOnlyCollection<string>> GetPurchasedTourIdsAsync(string touristId, CancellationToken cancellationToken)
    {
        var endpoint = $"{toursServiceUrl.TrimEnd('/')}/api/tours/internal/purchases/by-tourist/{Uri.EscapeDataString(touristId)}";
        using var response = await httpClient.GetAsync(endpoint, cancellationToken);
        if (!response.IsSuccessStatusCode)
        {
            return [];
        }

        var payload = await response.Content.ReadFromJsonAsync<PurchasedTourIdsResponse>(cancellationToken);
        return payload?.TourIds?.Distinct().ToArray() ?? [];
    }

    public async Task CreatePurchasedToursAsync(string touristId, IReadOnlyCollection<string> tourIds, CancellationToken cancellationToken)
    {
        var response = await grpcClient.CreatePurchasedToursAsync(new CreatePurchasedToursRpcRequest
        {
            TouristId = touristId,
            TourIds = { tourIds }
        }, cancellationToken: cancellationToken);

        if (!response.Success)
        {
            throw new HttpRequestException(string.IsNullOrWhiteSpace(response.Message)
                ? "failed to create purchased tours"
                : response.Message);
        }
    }

    public async Task RollbackPurchasedToursAsync(string touristId, IReadOnlyCollection<string> tourIds, CancellationToken cancellationToken)
    {
        var endpoint = $"{toursServiceUrl.TrimEnd('/')}/api/tours/internal/purchases/rollback";
        using var response = await httpClient.PostAsJsonAsync(endpoint, new PurchasedToursRequest(touristId, tourIds.ToArray()), cancellationToken);
        response.EnsureSuccessStatusCode();
    }

    private static string GetRequiredSetting(IConfiguration configuration, string key, string fallback)
    {
        var value = configuration[key];
        return string.IsNullOrWhiteSpace(value) ? fallback : value.Trim();
    }

    private static ToursRpcService.ToursRpcServiceClient CreateGrpcClient(string address)
    {
        var channel = GrpcChannel.ForAddress(address);
        return new ToursRpcService.ToursRpcServiceClient(channel);
    }

    private sealed record PurchasedTourIdsResponse(string TouristId, string[] TourIds);
    private sealed record PurchasedToursRequest(string TouristId, string[] TourIds);
}
