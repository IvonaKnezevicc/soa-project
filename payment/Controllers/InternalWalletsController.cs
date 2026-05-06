using Microsoft.AspNetCore.Mvc;
using PaymentService.Dtos;
using PaymentService.Services;

namespace PaymentService.Controllers;

[ApiController]
[Route("api/payment/internal/wallets")]
public class InternalWalletsController(IWalletService walletService) : ControllerBase
{
    [HttpPost]
    public async Task<ActionResult<WalletResponse>> Create(
        [FromBody] CreateWalletRequest request,
        CancellationToken cancellationToken)
    {
        var wallet = await walletService.CreateWalletAsync(request, cancellationToken);
        return Created(string.Empty, wallet);
    }
}
