using Microsoft.AspNetCore.Mvc;

namespace PaymentService.Controllers;

[ApiController]
public class HealthController : ControllerBase
{
    [HttpGet("/health")]
    public IActionResult Health()
    {
        return Ok(new { service = "payment", status = "ok" });
    }
}
