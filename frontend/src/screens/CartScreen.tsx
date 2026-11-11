import React from 'react';
import { CartItem, Restaurant, DeliveryAddress } from '../types';
import {
  ShoppingBag,
  Trash2,
  Plus,
  Minus,
  MapPin,
  Clock,
  ArrowRight,
  ArrowLeft,
  Home,
  AlertCircle,
  ShieldCheck,
} from 'lucide-react';

interface CartScreenProps {
  cart: CartItem[];
  restaurants: Restaurant[];
  currentAddress: DeliveryAddress;
  onUpdateQuantity: (productId: string, delta: number) => void;
  onRemoveItem: (productId: string) => void;
  onClearCart: () => void;
  onProceedToCheckout: () => void;
  onContinueShopping: () => void;
  onNavigateToHome?: () => void;
}

export const CartScreen: React.FC<CartScreenProps> = ({
  cart,
  restaurants,
  currentAddress,
  onUpdateQuantity,
  onRemoveItem,
  onClearCart,
  onProceedToCheckout,
  onContinueShopping,
  onNavigateToHome,
}) => {
  if (cart.length === 0) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center">
        <div className="w-16 h-16 rounded-2xl bg-stone-100 border border-stone-200 flex items-center justify-center mx-auto mb-4 text-stone-400">
          <ShoppingBag className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-stone-900">Tu carrito está vacío</h2>
        <p className="text-xs text-stone-500 mt-1 max-w-sm mx-auto">
          Explorá las cartas de los restaurantes de San Miguel de Tucumán y seleccioná tus platos favoritos.
        </p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          {onNavigateToHome && (
            <button
              onClick={onNavigateToHome}
              className="px-5 py-2.5 rounded-xl border border-stone-200 bg-white hover:bg-stone-50 text-stone-800 text-xs font-bold transition-colors cursor-pointer inline-flex items-center gap-1.5"
            >
              <Home className="w-3.5 h-3.5 text-red-600" />
              <span>Volver al inicio</span>
            </button>
          )}
          <button
            onClick={onContinueShopping}
            className="px-5 py-2.5 rounded-xl bg-stone-900 hover:bg-stone-800 text-white text-xs font-bold transition-colors cursor-pointer"
          >
            Explorar Catálogo en SMT
          </button>
        </div>
      </div>
    );
  }

  // Get primary restaurant
  const primaryStoreId = cart[0]?.restaurantId;
  const store = restaurants.find((r) => r.id === primaryStoreId);

  const subtotal = cart.reduce((acc, ci) => acc + ci.product.price * ci.quantity, 0);
  const deliveryFee = store ? store.deliveryFee : 1400;
  const serviceFee = 450;
  const total = subtotal + deliveryFee + serviceFee;

  const minOrderMet = !store || subtotal >= store.minOrder;
  const minDifference = store ? Math.max(0, store.minOrder - subtotal) : 0;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Top back */}
      <div className="mb-4 flex items-center gap-2">
        {onNavigateToHome && (
          <>
            <button
              onClick={onNavigateToHome}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-stone-800 hover:text-red-700 bg-white hover:bg-stone-50 px-3 py-1.5 rounded-lg border border-stone-200 shadow-xs transition-colors cursor-pointer"
            >
              <Home className="w-3.5 h-3.5 text-stone-500" />
              <span>Volver al inicio</span>
            </button>
            <span className="text-stone-300">/</span>
          </>
        )}
        <button
          onClick={onContinueShopping}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-stone-600 hover:text-stone-900 bg-white hover:bg-stone-50 px-3 py-1.5 rounded-lg border border-stone-200 shadow-xs transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Agregar más productos</span>
        </button>
      </div>

      <div className="flex items-center justify-between border-b border-stone-200 pb-4 mb-6">
        <div>
          <h1 className="text-2xl font-black text-stone-900 tracking-tight">
            Carrito de Compras
          </h1>
          <p className="text-xs text-stone-500 mt-0.5">
            Pedido para {store ? store.name : 'Restaurante SMT'} · San Miguel de Tucumán
          </p>
        </div>
        <button
          onClick={onClearCart}
          className="text-xs font-semibold text-stone-400 hover:text-red-700 transition-colors cursor-pointer"
        >
          Vaciar carrito
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left: Cart Items List */}
        <div className="lg:col-span-7 flex flex-col gap-4">
          <div className="bg-white rounded-2xl border border-stone-200 divide-y divide-stone-100 overflow-hidden shadow-xs">
            {cart.map((ci) => (
              <div key={ci.product.id} className="p-4 flex items-center justify-between gap-4">
                <img
                  src={ci.product.image}
                  alt={ci.product.name}
                  className="w-16 h-16 rounded-lg object-cover shrink-0 border border-stone-100"
                />

                <div className="flex-1 min-w-0">
                  <h4 className="font-bold text-stone-900 text-sm truncate">{ci.product.name}</h4>
                  <div className="text-xs text-stone-500 mt-0.5">
                    ${ci.product.price.toLocaleString('es-AR')} por unidad
                  </div>
                  {ci.notes && (
                    <div className="text-[11px] text-stone-600 bg-stone-50 px-2 py-0.5 rounded mt-1 border border-stone-100 inline-block">
                      Nota: "{ci.notes}"
                    </div>
                  )}
                </div>

                {/* Quantity Controls & Price */}
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1.5 border border-stone-200 rounded-lg p-1 bg-stone-50">
                    <button
                      onClick={() => onUpdateQuantity(ci.product.id, -1)}
                      className="w-6 h-6 rounded bg-white text-stone-700 flex items-center justify-center hover:bg-stone-100 text-xs cursor-pointer border border-stone-200"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="w-6 text-center text-xs font-bold text-stone-900">
                      {ci.quantity}
                    </span>
                    <button
                      onClick={() => onUpdateQuantity(ci.product.id, 1)}
                      className="w-6 h-6 rounded bg-white text-stone-700 flex items-center justify-center hover:bg-stone-100 text-xs cursor-pointer border border-stone-200"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>

                  <div className="text-right min-w-16">
                    <div className="font-black text-stone-900 text-sm">
                      ${(ci.product.price * ci.quantity).toLocaleString('es-AR')}
                    </div>
                    <button
                      onClick={() => onRemoveItem(ci.product.id)}
                      className="text-stone-400 hover:text-red-700 text-[11px] mt-1 inline-flex items-center gap-0.5 cursor-pointer"
                    >
                      <Trash2 className="w-3 h-3" />
                      <span>Quitar</span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Delivery destination preview */}
          <div className="bg-white p-4 rounded-xl border border-stone-200 flex items-center justify-between text-xs text-stone-600">
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-red-700 shrink-0" />
              <div>
                <span className="font-bold text-stone-900">Entrega en SMT:</span>{' '}
                {currentAddress.street} {currentAddress.number}, {currentAddress.neighborhood}
              </div>
            </div>
            <span className="text-[11px] font-semibold text-stone-400">
              San Miguel de Tucumán
            </span>
          </div>
        </div>

        {/* Right: Order Summary aside */}
        <aside className="lg:col-span-5 bg-white rounded-2xl border border-stone-200 p-6 shadow-sm sticky top-24">
          <h3 className="font-extrabold text-stone-900 text-base pb-3 border-b border-stone-100 mb-4">
            Resumen del Pedido
          </h3>

          <div className="space-y-2.5 text-xs text-stone-600 pb-4 border-b border-stone-100">
            <div className="flex justify-between">
              <span>Subtotal productos ({cart.reduce((a, b) => a + b.quantity, 0)})</span>
              <span className="font-bold text-stone-900">${subtotal.toLocaleString('es-AR')}</span>
            </div>
            <div className="flex justify-between">
              <span>Costo de envío ({store?.neighborhood || 'SMT'})</span>
              <span className="font-bold text-stone-900">${deliveryFee.toLocaleString('es-AR')}</span>
            </div>
            <div className="flex justify-between">
              <span>Tasa de servicio de plataforma</span>
              <span className="font-bold text-stone-900">${serviceFee.toLocaleString('es-AR')}</span>
            </div>

            <div className="pt-3 border-t border-stone-100 flex justify-between text-base font-black text-stone-900">
              <span>Total Estimado</span>
              <span className="text-red-700 text-lg font-black">${total.toLocaleString('es-AR')}</span>
            </div>
          </div>

          {/* Min order alert if not met */}
          {!minOrderMet && store && (
            <div className="mt-4 p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold">Mínimo de compra:</span> {store.name} requiere un pedido mínimo de ${store.minOrder.toLocaleString('es-AR')}. Agregá ${minDifference.toLocaleString('es-AR')} más para continuar.
              </div>
            </div>
          )}

          {/* Proceed button */}
          <button
            onClick={onProceedToCheckout}
            disabled={!minOrderMet}
            className={`mt-6 w-full py-3.5 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-xs cursor-pointer ${
              minOrderMet
                ? 'bg-stone-900 hover:bg-stone-800 text-white'
                : 'bg-stone-200 text-stone-400 cursor-not-allowed'
            }`}
          >
            <span>Continuar a Entrega y Pago</span>
            <ArrowRight className="w-4 h-4" />
          </button>

          <div className="mt-4 flex items-center gap-2 justify-center text-[11px] text-stone-400">
            <ShieldCheck className="w-3.5 h-3.5 text-stone-500" />
            <span>Los importes se confirman antes de enviar la orden a la API</span>
          </div>
        </aside>
      </div>
    </div>
  );
};
