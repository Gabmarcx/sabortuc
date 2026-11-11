import {
  Restaurant,
  Product,
  Order,
  FilterParams,
} from '../types';

/**
 * Cliente de la API REST de SaborTUC (backend ASP.NET Core / .NET 6).
 * En desarrollo, Vite redirige /api -> http://localhost:5080 (ver vite.config.ts).
 * Para apuntar a otro servidor definí VITE_API_URL (ej: https://mi-api.com/api).
 */
const API_URL: string = (import.meta as any).env?.VITE_API_URL ?? '/api';

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, {
      headers: { 'Content-Type': 'application/json' },
      ...init,
    });
  } catch {
    throw new ApiError(0, 'No se pudo conectar con el servidor de SaborTUC.');
  }
  if (!res.ok) {
    let message = `Error ${res.status}`;
    try {
      const body = await res.json();
      if (body?.message) message = body.message;
    } catch {
      /* sin cuerpo JSON */
    }
    throw new ApiError(res.status, message);
  }
  return (await res.json()) as T;
}

export interface DeliveryEstimate {
  distanceKm: number;
  durationMin: number;
  source: 'openrouteservice' | 'estimado';
  withinCoverage: boolean;
  maxDeliveryKm: number;
}

export const SaborTucApi = {
  /** GET /api/restaurants — consultar restaurantes (con filtros) */
  async getRestaurants(filters?: Partial<FilterParams>): Promise<Restaurant[]> {
    const q = new URLSearchParams();
    if (filters?.searchQuery?.trim()) q.set('search', filters.searchQuery.trim());
    if (filters?.category && filters.category !== 'Todas') q.set('category', filters.category);
    if (filters?.neighborhood && filters.neighborhood !== 'Todos') q.set('neighborhood', filters.neighborhood);
    if (filters?.onlyOpen) q.set('onlyOpen', 'true');
    if (filters?.maxDeliveryFee) q.set('maxDeliveryFee', String(filters.maxDeliveryFee));
    if (filters?.priceRange?.length) q.set('priceRange', filters.priceRange.join(','));
    if (filters?.sortBy) q.set('sortBy', filters.sortBy);
    const qs = q.toString();
    return request<Restaurant[]>(`/restaurants${qs ? `?${qs}` : ''}`);
  },

  /** GET /api/restaurants/{id} */
  async getRestaurantById(id: string): Promise<Restaurant | null> {
    try {
      return await request<Restaurant>(`/restaurants/${encodeURIComponent(id)}`);
    } catch (e) {
      if (e instanceof ApiError && e.status === 404) return null;
      throw e;
    }
  },

  /** GET /api/restaurants/{id}/products — carta con precios y disponibilidad */
  async getProducts(restaurantId: string): Promise<Product[]> {
    try {
      return await request<Product[]>(`/restaurants/${encodeURIComponent(restaurantId)}/products`);
    } catch (e) {
      if (e instanceof ApiError && e.status === 404) return [];
      throw e;
    }
  },

  /** POST /api/restaurants/{id}/availability — verificar precios y disponibilidad */
  async checkAvailability(
    restaurantId: string,
    productIds: string[]
  ): Promise<{
    available: boolean;
    restaurantOpen: boolean;
    unavailableProducts: string[];
    verifiedPrices: Record<string, number>;
  }> {
    return request(`/restaurants/${encodeURIComponent(restaurantId)}/availability`, {
      method: 'POST',
      body: JSON.stringify({ productIds }),
    });
  },

  /** GET /api/delivery/estimate — distancia y tiempo (API de mapas) */
  async estimateDelivery(
    restaurantId: string,
    street: string,
    number: string,
    neighborhood: string
  ): Promise<DeliveryEstimate> {
    const q = new URLSearchParams({ restaurantId, street, number, neighborhood });
    return request<DeliveryEstimate>(`/delivery/estimate?${q}`);
  },

  /** POST /api/orders — crear pedido (el servidor recalcula precios y totales) */
  async createOrder(
    orderPayload: Omit<Order, 'id' | 'createdAt' | 'status' | 'statusHistory' | 'paymentStatus'>
  ): Promise<Order> {
    return request<Order>('/orders', { method: 'POST', body: JSON.stringify(orderPayload) });
  },

  /** GET /api/orders[?email=] — consultar pedidos */
  async getOrders(email?: string): Promise<Order[]> {
    const qs = email ? `?email=${encodeURIComponent(email)}` : '';
    try {
      return await request<Order[]>(`/orders${qs}`);
    } catch {
      return [];
    }
  },

  /** GET /api/orders/{id} — consultar el estado (e historial) de un pedido */
  async getOrderStatus(orderId: string): Promise<Order | null> {
    try {
      return await request<Order>(`/orders/${encodeURIComponent(orderId)}`);
    } catch (e) {
      if (e instanceof ApiError && e.status === 404) return null;
      throw e;
    }
  },

  /** POST /api/orders/{id}/advance — avanzar al siguiente estado (acción del restaurante, para demo) */
  async advanceOrderStatus(orderId: string): Promise<Order | null> {
    try {
      return await request<Order>(`/orders/${encodeURIComponent(orderId)}/advance`, { method: 'POST' });
    } catch (e) {
      if (e instanceof ApiError) {
        window.alert(e.message);
        return null;
      }
      throw e;
    }
  },

  /** POST /api/orders/{id}/cancel */
  async cancelOrder(orderId: string): Promise<Order> {
    return request<Order>(`/orders/${encodeURIComponent(orderId)}/cancel`, { method: 'POST' });
  },
};
