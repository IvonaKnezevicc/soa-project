using PaymentService.Dtos;

namespace PaymentService.Services;

public interface IWalletService
{
    Task<WalletResponse> CreateWalletAsync(CreateWalletRequest request, CancellationToken cancellationToken);
    Task<WalletResponse> GetMyWalletAsync(HttpContext context, CancellationToken cancellationToken);
}
