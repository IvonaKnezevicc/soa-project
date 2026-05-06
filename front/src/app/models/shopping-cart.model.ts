export interface ShoppingCartItem {
  id: string;
  tourId: string;
  tourName: string;
  price: number;
}

export interface ShoppingCart {
  id: string;
  touristId: string;
  touristUsername: string;
  totalPrice: number;
  items: ShoppingCartItem[];
}
