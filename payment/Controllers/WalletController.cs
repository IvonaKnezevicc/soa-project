using Microsoft.AspNetCore.Mvc;
using PaymentService.Dtos;
using PaymentService.Services;

namespace PaymentService.Controllers;

[ApiController]
[Route("api/payment/wallet/me")]
public class WalletController(IWalletService walletService) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<WalletResponse>> GetMyWallet(CancellationToken cancellationToken)
    {
        var wallet = await walletService.GetMyWalletAsync(HttpContext, cancellationToken);
        return Ok(wallet);
    }
}
