using PaymentService.Services;

namespace PaymentService.Clients;

public interface IToursClient
{
    Task<TourPurchaseInfo?> GetTourForPurchaseAsync(string tourId, CancellationToken cancellationToken);
    Task<IReadOnlyCollection<string>> GetPurchasedTourIdsAsync(string touristId, CancellationToken cancellationToken);
    Task CreatePurchasedToursAsync(string touristId, IReadOnlyCollection<string> tourIds, CancellationToken cancellationToken);
    Task RollbackPurchasedToursAsync(string touristId, IReadOnlyCollection<string> tourIds, CancellationToken cancellationToken);
}
