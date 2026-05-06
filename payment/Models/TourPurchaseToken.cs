namespace PaymentService.Models;

public class TourPurchaseToken
{
    public Guid Id { get; set; }
    public string TouristId { get; set; } = string.Empty;
    public string TouristUsername { get; set; } = string.Empty;
    public string TourId { get; set; } = string.Empty;
    public string TourName { get; set; } = string.Empty;
    public decimal Price { get; set; }
    public DateTime PurchasedAt { get; set; }
}
