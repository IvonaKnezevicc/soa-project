using Microsoft.AspNetCore.Mvc;
using PaymentService.Dtos;
using PaymentService.Services;

namespace PaymentService.Controllers;

[ApiController]
[Route("api/payment/internal/purchases")]
public class InternalPurchasesController(IPaymentCartService paymentCartService) : ControllerBase
{
    [HttpGet("by-tourist")]
    public async Task<ActionResult<InternalPurchasedToursResponse>> GetByTourist(
        [FromQuery] string touristUsername,
        CancellationToken cancellationToken)
    {
        var response = await paymentCartService.GetPurchasedTourIdsByTouristAsync(touristUsername, cancellationToken);
        return Ok(response);
    }
}
