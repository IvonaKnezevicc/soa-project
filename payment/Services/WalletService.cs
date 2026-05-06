using PaymentService.Common;
using PaymentService.Dtos;
using PaymentService.Models;
using PaymentService.Repositories;

namespace PaymentService.Services;

public class WalletService(IPaymentRepository paymentRepository) : IWalletService
{
    private const decimal InitialWalletBalance = 2000.00m;

    public async Task<WalletResponse> CreateWalletAsync(CreateWalletRequest request, CancellationToken cancellationToken)
    {
        var touristId = (request.TouristId ?? string.Empty).Trim();
        if (string.IsNullOrWhiteSpace(touristId))
        {
            throw new ApiException(StatusCodes.Status400BadRequest, "touristId is required");
        }

        var existingWallet = await paymentRepository.GetWalletByTouristIdAsync(touristId, cancellationToken);
        if (existingWallet is not null)
        {
            return ToResponse(existingWallet);
        }

        var now = DateTime.UtcNow;
        var wallet = new Wallet
        {
            Id = Guid.NewGuid(),
            TouristId = touristId,
            Balance = InitialWalletBalance,
            CreatedAt = now,
            UpdatedAt = now
        };

        await paymentRepository.CreateWalletAsync(wallet, cancellationToken);
        return ToResponse(wallet);
    }

    private static WalletResponse ToResponse(Wallet wallet)
    {
        return new WalletResponse(wallet.Id.ToString(), wallet.TouristId, wallet.Balance);
    }
}
