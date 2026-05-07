using PaymentService.Clients;
using PaymentService.Common;
using PaymentService.Dtos;
using PaymentService.Models;
using PaymentService.Repositories;

namespace PaymentService.Services;

public class PaymentCartService(
    IStakeholdersClient stakeholdersClient,
    IToursClient toursClient,
    IPaymentRepository paymentRepository) : IPaymentCartService
{
    public async Task<ShoppingCartResponse> GetMyCartAsync(HttpContext context, CancellationToken cancellationToken)
    {
        var identity = await RequireTouristIdentityAsync(context, cancellationToken);
        var cart = await paymentRepository.GetOrCreateCartAsync(identity, cancellationToken);
        return ToResponse(cart);
    }

    public async Task<ShoppingCartResponse> AddTourToCartAsync(
        HttpContext context,
        AddCartItemRequest request,
        CancellationToken cancellationToken)
    {
        var identity = await RequireTouristIdentityAsync(context, cancellationToken);

        var tourId = (request.TourId ?? string.Empty).Trim();
        if (string.IsNullOrWhiteSpace(tourId))
        {
            throw new ApiException(StatusCodes.Status400BadRequest, "tourId is required");
        }

        var purchasedTourIds = await toursClient.GetPurchasedTourIdsAsync(identity.UserId, cancellationToken);
        if (purchasedTourIds.Contains(tourId))
        {
            throw new ApiException(StatusCodes.Status400BadRequest, "tour is already purchased");
        }

        var cart = await paymentRepository.GetOrCreateCartAsync(identity, cancellationToken);
        if (cart.Items.Any(item => item.TourId == tourId))
        {
            throw new ApiException(StatusCodes.Status409Conflict, "tour is already in the cart");
        }

        var tour = await toursClient.GetTourForPurchaseAsync(tourId, cancellationToken);
        if (tour is null)
        {
            throw new ApiException(StatusCodes.Status404NotFound, "tour not found");
        }

        if (!string.Equals(tour.Status, "published", StringComparison.OrdinalIgnoreCase))
        {
            throw new ApiException(StatusCodes.Status400BadRequest, "only published tours can be added to the cart");
        }

        var now = DateTime.UtcNow;
        var orderItem = new OrderItem
        {
            Id = Guid.NewGuid(),
            ShoppingCartId = cart.Id,
            TourId = tour.Id,
            TourName = tour.Name,
            Price = tour.Price,
            CreatedAt = now
        };
        paymentRepository.AddOrderItem(cart, orderItem);
        cart.UpdatedAt = now;

        await paymentRepository.SaveChangesAsync(cancellationToken);
        return ToResponse(cart);
    }

    public async Task<ShoppingCartResponse> RemoveTourFromCartAsync(
        HttpContext context,
        string tourId,
        CancellationToken cancellationToken)
    {
        var identity = await RequireTouristIdentityAsync(context, cancellationToken);
        var cart = await paymentRepository.GetCartByTouristIdAsync(identity.UserId, cancellationToken);
        if (cart is null)
        {
            throw new ApiException(StatusCodes.Status404NotFound, "shopping cart not found");
        }

        var existingItem = cart.Items.SingleOrDefault(item => item.TourId == tourId);
        if (existingItem is null)
        {
            throw new ApiException(StatusCodes.Status404NotFound, "tour is not in the cart");
        }

        paymentRepository.RemoveOrderItem(cart, existingItem);
        cart.UpdatedAt = DateTime.UtcNow;

        await paymentRepository.SaveChangesAsync(cancellationToken);
        return ToResponse(cart);
    }

    public async Task<CheckoutResponse> CheckoutAsync(HttpContext context, CancellationToken cancellationToken)
    {
        var identity = await RequireTouristIdentityAsync(context, cancellationToken);
        var cart = await paymentRepository.GetCartByTouristIdAsync(identity.UserId, cancellationToken);
        if (cart is null || cart.Items.Count == 0)
        {
            throw new ApiException(StatusCodes.Status400BadRequest, "shopping cart is empty");
        }

        var purchasedTourIds = await toursClient.GetPurchasedTourIdsAsync(identity.UserId, cancellationToken);

        foreach (var item in cart.Items)
        {
            var tour = await toursClient.GetTourForPurchaseAsync(item.TourId, cancellationToken);
            if (tour is null)
            {
                throw new ApiException(StatusCodes.Status400BadRequest, $"tour '{item.TourId}' no longer exists");
            }

            if (!string.Equals(tour.Status, "published", StringComparison.OrdinalIgnoreCase))
            {
                throw new ApiException(StatusCodes.Status400BadRequest, $"tour '{tour.Name}' is no longer available for purchase");
            }

            if (purchasedTourIds.Contains(item.TourId))
            {
                throw new ApiException(StatusCodes.Status400BadRequest, $"tour '{tour.Name}' is already purchased");
            }
        }

        var totalPrice = cart.Items.Sum(item => item.Price);
        var purchasedItemCount = cart.Items.Count;
        var wallet = await paymentRepository.GetWalletByTouristIdAsync(identity.UserId, cancellationToken);
        if (wallet is null)
        {
            throw new ApiException(StatusCodes.Status400BadRequest, "wallet not found");
        }
        if (wallet.Balance < totalPrice)
        {
            throw new ApiException(StatusCodes.Status400BadRequest, "insufficient wallet balance");
        }

        var purchasedAt = DateTime.UtcNow;
        var cartTourIds = cart.Items.Select(item => item.TourId).Distinct().ToArray();

        try
        {
            wallet.Balance -= totalPrice;
            wallet.UpdatedAt = purchasedAt;
            await paymentRepository.SaveChangesAsync(cancellationToken);

            try
            {
                await toursClient.CreatePurchasedToursAsync(identity.UserId, cartTourIds, cancellationToken);
            }
            catch
            {
                wallet.Balance += totalPrice;
                wallet.UpdatedAt = DateTime.UtcNow;
                await paymentRepository.SaveChangesAsync(cancellationToken);
                throw new ApiException(StatusCodes.Status500InternalServerError, "checkout failed while creating purchased tours");
            }

            try
            {
                await paymentRepository.FinalizeCheckoutAsync(cart, purchasedAt, cancellationToken);
            }
            catch
            {
                try
                {
                    await toursClient.RollbackPurchasedToursAsync(identity.UserId, cartTourIds, cancellationToken);
                }
                catch
                {
                    throw new ApiException(StatusCodes.Status500InternalServerError, "checkout compensation failed after purchase creation");
                }

                wallet.Balance += totalPrice;
                wallet.UpdatedAt = DateTime.UtcNow;
                await paymentRepository.SaveChangesAsync(cancellationToken);
                throw new ApiException(StatusCodes.Status500InternalServerError, "checkout failed after purchase creation");
            }

            return new CheckoutResponse(purchasedItemCount, purchasedAt);
        }
        catch (ApiException)
        {
            throw;
        }
        catch
        {
            throw new ApiException(StatusCodes.Status500InternalServerError, "checkout failed");
        }
    }

    private async Task<AuthenticatedIdentity> RequireTouristIdentityAsync(HttpContext context, CancellationToken cancellationToken)
    {
        var identity = await stakeholdersClient.ResolveIdentityAsync(context, cancellationToken);
        if (identity is null)
        {
            throw new ApiException(StatusCodes.Status401Unauthorized, "unauthorized");
        }

        if (!string.Equals(identity.Role, "tourist", StringComparison.OrdinalIgnoreCase))
        {
            throw new ApiException(StatusCodes.Status403Forbidden, "only tourist users can access payment cart");
        }

        return identity;
    }

    private static ShoppingCartResponse ToResponse(ShoppingCart cart)
    {
        var items = cart.Items
            .OrderBy(item => item.CreatedAt)
            .Select(item => new OrderItemResponse(
                item.Id.ToString(),
                item.TourId,
                item.TourName,
                item.Price))
            .ToList();
        var totalPrice = items.Sum(item => item.Price);

        return new ShoppingCartResponse(
            cart.Id.ToString(),
            cart.TouristId,
            cart.TouristUsername,
            totalPrice,
            items);
    }
}
