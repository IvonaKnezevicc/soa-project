using Microsoft.EntityFrameworkCore;
using PaymentService.Models;
using PaymentService.Services;

namespace PaymentService.Repositories;

public class PaymentRepository(PaymentDbContext dbContext) : IPaymentRepository
{
    public async Task<Wallet?> GetWalletByTouristIdAsync(string touristId, CancellationToken cancellationToken)
    {
        return await dbContext.Wallets
            .SingleOrDefaultAsync(item => item.TouristId == touristId, cancellationToken);
    }

    public async Task CreateWalletAsync(Wallet wallet, CancellationToken cancellationToken)
    {
        dbContext.Wallets.Add(wallet);
        await dbContext.SaveChangesAsync(cancellationToken);
    }

    public async Task<ShoppingCart> GetOrCreateCartAsync(AuthenticatedIdentity identity, CancellationToken cancellationToken)
    {
        var cart = await GetCartByTouristIdAsync(identity.UserId, cancellationToken);
        if (cart is not null)
        {
            return cart;
        }

        var now = DateTime.UtcNow;
        cart = new ShoppingCart
        {
            Id = Guid.NewGuid(),
            TouristId = identity.UserId,
            TouristUsername = identity.Username,
            CreatedAt = now,
            UpdatedAt = now
        };

        dbContext.ShoppingCarts.Add(cart);
        await dbContext.SaveChangesAsync(cancellationToken);
        await dbContext.Entry(cart).Collection(item => item.Items).LoadAsync(cancellationToken);
        return cart;
    }

    public async Task<ShoppingCart?> GetCartByTouristIdAsync(string touristId, CancellationToken cancellationToken)
    {
        return await dbContext.ShoppingCarts
            .Include(item => item.Items)
            .SingleOrDefaultAsync(item => item.TouristId == touristId, cancellationToken);
    }

    public async Task<bool> HasPurchasedTourAsync(string touristId, string tourId, CancellationToken cancellationToken)
    {
        return await dbContext.TourPurchaseTokens
            .AnyAsync(item => item.TouristId == touristId && item.TourId == tourId, cancellationToken);
    }

    public async Task<IReadOnlyList<string>> GetPurchasedTourIdsByUsernameAsync(string touristUsername, CancellationToken cancellationToken)
    {
        return await dbContext.TourPurchaseTokens
            .Where(item => item.TouristUsername == touristUsername)
            .Select(item => item.TourId)
            .Distinct()
            .ToListAsync(cancellationToken);
    }

    public void AddOrderItem(ShoppingCart cart, OrderItem orderItem)
    {
        dbContext.OrderItems.Add(orderItem);
        cart.Items.Add(orderItem);
    }

    public void RemoveOrderItem(ShoppingCart cart, OrderItem orderItem)
    {
        dbContext.OrderItems.Remove(orderItem);
        cart.Items.Remove(orderItem);
    }

    public async Task SaveChangesAsync(CancellationToken cancellationToken)
    {
        await dbContext.SaveChangesAsync(cancellationToken);
    }

    public async Task<CheckoutResult> CheckoutAsync(ShoppingCart cart, AuthenticatedIdentity identity, CancellationToken cancellationToken)
    {
        await using var transaction = await dbContext.Database.BeginTransactionAsync(cancellationToken);

        try
        {
            var purchasedAt = DateTime.UtcNow;
            var tokens = cart.Items.Select(item => new TourPurchaseToken
            {
                Id = Guid.NewGuid(),
                TouristId = identity.UserId,
                TouristUsername = identity.Username,
                TourId = item.TourId,
                TourName = item.TourName,
                Price = item.Price,
                PurchasedAt = purchasedAt
            }).ToList();

            dbContext.TourPurchaseTokens.AddRange(tokens);
            dbContext.OrderItems.RemoveRange(cart.Items);
            cart.Items.Clear();
            cart.UpdatedAt = purchasedAt;

            await dbContext.SaveChangesAsync(cancellationToken);
            await transaction.CommitAsync(cancellationToken);

            return new CheckoutResult(tokens.Count, purchasedAt);
        }
        catch
        {
            await transaction.RollbackAsync(cancellationToken);
            throw;
        }
    }
}
