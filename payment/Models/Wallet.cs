namespace PaymentService.Models;

public class Wallet
{
    public Guid Id { get; set; }
    public string TouristId { get; set; } = string.Empty;
    public decimal Balance { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}
