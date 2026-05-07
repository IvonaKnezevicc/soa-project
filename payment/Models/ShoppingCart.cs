namespace PaymentService.Models;

public class ShoppingCart
{
    public Guid Id { get; set; }
    public string TouristId { get; set; } = string.Empty;
    public string TouristUsername { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    public List<OrderItem> Items { get; set; } = [];
}
