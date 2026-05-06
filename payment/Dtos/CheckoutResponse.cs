namespace PaymentService.Dtos;

public record CheckoutResponse(int PurchasedItemCount, DateTime PurchasedAt);
