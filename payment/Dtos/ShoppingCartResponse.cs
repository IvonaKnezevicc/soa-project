namespace PaymentService.Dtos;

public record ShoppingCartResponse(
    string Id,
    string TouristId,
    string TouristUsername,
    decimal TotalPrice,
    IReadOnlyList<OrderItemResponse> Items);

public record OrderItemResponse(
    string Id,
    string TourId,
    string TourName,
    decimal Price);
