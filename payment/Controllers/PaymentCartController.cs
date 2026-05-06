using Microsoft.AspNetCore.Mvc;
using PaymentService.Dtos;
using PaymentService.Services;

namespace PaymentService.Controllers;

[ApiController]
[Route("api/payment/cart/me")]
public class PaymentCartController(IPaymentCartService paymentCartService) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<ShoppingCartResponse>> GetMyCart(CancellationToken cancellationToken)
    {
        var cart = await paymentCartService.GetMyCartAsync(HttpContext, cancellationToken);
        return Ok(cart);
    }

    [HttpPost("items")]
    public async Task<ActionResult<ShoppingCartResponse>> AddItem(
        [FromBody] AddCartItemRequest request,
        CancellationToken cancellationToken)
    {
        var cart = await paymentCartService.AddTourToCartAsync(HttpContext, request, cancellationToken);
        return Ok(cart);
    }

    [HttpDelete("items/{tourId}")]
    public async Task<ActionResult<ShoppingCartResponse>> RemoveItem(string tourId, CancellationToken cancellationToken)
    {
        var cart = await paymentCartService.RemoveTourFromCartAsync(HttpContext, tourId, cancellationToken);
        return Ok(cart);
    }

    [HttpPost("checkout")]
    public async Task<ActionResult<CheckoutResponse>> Checkout(CancellationToken cancellationToken)
    {
        var result = await paymentCartService.CheckoutAsync(HttpContext, cancellationToken);
        return Ok(result);
    }
}
