namespace PaymentService.Models;

public class OrderItem
{
    public Guid Id { get; set; }
    public Guid ShoppingCartId { get; set; }
    public ShoppingCart ShoppingCart { get; set; } = null!;
    public string TourId { get; set; } = string.Empty;
    public string TourName { get; set; } = string.Empty;
    public decimal Price { get; set; }
    public DateTime CreatedAt { get; set; }
}
