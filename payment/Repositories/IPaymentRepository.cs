using PaymentService.Models;
using PaymentService.Services;

namespace PaymentService.Repositories;

public interface IPaymentRepository
{
    Task<Wallet?> GetWalletByTouristIdAsync(string touristId, CancellationToken cancellationToken);
    Task CreateWalletAsync(Wallet wallet, CancellationToken cancellationToken);
    Task<ShoppingCart> GetOrCreateCartAsync(AuthenticatedIdentity identity, CancellationToken cancellationToken);
    Task<ShoppingCart?> GetCartByTouristIdAsync(string touristId, CancellationToken cancellationToken);
    Task<bool> HasPurchasedTourAsync(string touristId, string tourId, CancellationToken cancellationToken);
    Task<IReadOnlyList<string>> GetPurchasedTourIdsByUsernameAsync(string touristUsername, CancellationToken cancellationToken);
    void AddOrderItem(ShoppingCart cart, OrderItem orderItem);
    void RemoveOrderItem(ShoppingCart cart, OrderItem orderItem);
    Task SaveChangesAsync(CancellationToken cancellationToken);
    Task<CheckoutResult> CheckoutAsync(ShoppingCart cart, AuthenticatedIdentity identity, CancellationToken cancellationToken);
}
