using PaymentService.Services;

namespace PaymentService.Clients;

public interface IToursClient
{
    Task<TourPurchaseInfo?> GetTourForPurchaseAsync(string tourId, CancellationToken cancellationToken);
}
