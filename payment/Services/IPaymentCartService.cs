using PaymentService.Dtos;

namespace PaymentService.Services;

public interface IPaymentCartService
{
    Task<ShoppingCartResponse> GetMyCartAsync(HttpContext context, CancellationToken cancellationToken);
    Task<ShoppingCartResponse> AddTourToCartAsync(HttpContext context, AddCartItemRequest request, CancellationToken cancellationToken);
    Task<ShoppingCartResponse> RemoveTourFromCartAsync(HttpContext context, string tourId, CancellationToken cancellationToken);
    Task<CheckoutResponse> CheckoutAsync(HttpContext context, CancellationToken cancellationToken);
    Task<InternalPurchasedToursResponse> GetPurchasedTourIdsByTouristAsync(string touristUsername, CancellationToken cancellationToken);
}
