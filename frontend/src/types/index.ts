export type RestaurantCategory =
  | 'Todas'
  | 'Pizzería'
  | 'Regional'
  | 'Cafetería & Pastelería'
  | 'Hamburguesería'
  | 'Bodegón & Cocina'
  | 'Bar & Cervecería'
  | 'Parrilla & Asador'
  | 'Restaurante & Grill'
  | 'Sándwiches & Minutas';

export type SmtNeighborhood =
  | 'Barrio Norte'
  | 'Barrio Sur'
  | 'Centro'
  | 'Plaza Independencia'
  | 'Centro Histórico';

export interface Coordinates {
  lat: number;
  lng: number;
}

export interface Product {
  id: string;
  restaurantId: string;
  name: string;
  description: string;
  category: string;
  price: number; // in ARS ($)
  image: string;
  available: boolean;
  isPopular?: boolean;
  verified: boolean;
  dietary?: ('vegetariano' | 'sin_tacc' | 'apto_celiaco')[];
}

export interface Restaurant {
  id: string;
  name: string;
  category: RestaurantCategory;
  address: string; // Real street & number in San Miguel de Tucumán
  neighborhood: SmtNeighborhood;
  coordinates: Coordinates;
  image: string;
  coverImage?: string;
  rating: number; // 1.0 - 5.0
  reviewsCount: number;
  isOpen: boolean;
  openingHours: string;
  estimatedDeliveryTime: string; // e.g. "25-40 min"
  deliveryFee: number; // in ARS ($)
  minOrder: number; // in ARS ($)
  priceRange: '$' | '$$' | '$$$';
  phone: string;
  menuVerifiedStatus: 'Verificado' | 'Datos demo en validación';
  tags: string[];
  products: Product[];
}

export interface CartItem {
  product: Product;
  restaurantId: string;
  restaurantName: string;
  quantity: number;
  notes?: string;
  addedAt?: string;
}

export type OrderStatus =
  | 'recibido'
  | 'confirmado'
  | 'en_preparacion'
  | 'en_camino'
  | 'entregado'
  | 'cancelado';

export interface OrderStatusHistoryItem {
  status: OrderStatus;
  timestamp: string;
  description: string;
}

export interface DeliveryAddress {
  id: string;
  alias: string; // e.g. "Casa", "Trabajo", "Depto"
  street: string;
  number: string;
  apartment?: string;
  neighborhood: SmtNeighborhood;
  instructions?: string;
  city: 'San Miguel de Tucumán';
  isDefault: boolean;
}

export interface Order {
  id: string; // e.g., "SMT-2026-9041"
  customer: {
    name: string;
    phone: string;
    email: string;
  };
  deliveryAddress: DeliveryAddress;
  restaurantId: string;
  restaurantName: string;
  items: {
    productId: string;
    name: string;
    price: number;
    quantity: number;
    notes?: string;
  }[];
  subtotal: number;
  deliveryFee: number;
  serviceFee: number;
  discount: number;
  total: number;
  paymentMethod: 'mercadopago' | 'tarjeta_online' | 'efectivo_entrega' | 'transferencia';
  paymentStatus: 'pendiente' | 'aprobado' | 'rechazado'; // lo define el servidor según la pasarela de pagos
  status: OrderStatus;
  createdAt: string;
  statusHistory: OrderStatusHistoryItem[];
  estimatedDeliveryTime: string;
  isDemoOrder?: boolean;
  // Datos que agrega la API .NET
  distanceKm?: number; // API de mapas
  routeDurationMin?: number;
  paymentUrl?: string; // link de la pasarela de pagos externa
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  phone: string;
  savedAddresses: DeliveryAddress[];
}

export type ActiveScreen =
  | 'explore'
  | 'catalog'
  | 'map'
  | 'restaurant-detail'
  | 'cart'
  | 'checkout'
  | 'orders'
  | 'order-tracking'
  | 'auth'
  | 'profile';

export interface FilterParams {
  searchQuery: string;
  category: RestaurantCategory;
  neighborhood?: SmtNeighborhood | 'Todos';
  onlyOpen: boolean;
  maxDeliveryTime?: number;
  maxDeliveryFee?: number;
  priceRange?: ('$' | '$$' | '$$$')[];
  sortBy: 'recommended' | 'rating' | 'deliveryTime' | 'deliveryFee';
}
