import React, { useState } from 'react';
import { CartItem, Restaurant, DeliveryAddress, Order, SmtNeighborhood } from '../types';
import { SaborTucApi } from '../services/api';
import {
  MapPin,
  CreditCard,
  DollarSign,
  ArrowLeft,
  CheckCircle2,
  Clock,
  ShieldCheck,
  Building2,
  AlertCircle,
  Loader2,
} from 'lucide-react';

interface CheckoutScreenProps {
  cart: CartItem[];
  restaurants: Restaurant[];
  currentAddress: DeliveryAddress;
  savedAddresses: DeliveryAddress[];
  onOrderCreated: (order: Order) => void;
  onBackToCart: () => void;
  userName: string;
  userEmail: string;
  userPhone: string;
}

export const CheckoutScreen: React.FC<CheckoutScreenProps> = ({
  cart,
  restaurants,
  currentAddress,
  savedAddresses,
  onOrderCreated,
  onBackToCart,
  userName,
  userEmail,
  userPhone,
}) => {
  const storeId = cart[0]?.restaurantId;
  const store = restaurants.find((r) => r.id === storeId);

  // Form states
  const [customerName, setCustomerName] = useState(userName || 'Jazmín Berdú');
  const [customerPhone, setCustomerPhone] = useState(userPhone || '+54 381 482-9910');
  const [customerEmail, setCustomerEmail] = useState(userEmail || 'jazmin.berdu20@gmail.com');

  const [street, setStreet] = useState(currentAddress.street);
  const [number, setNumber] = useState(currentAddress.number);
  const [apartment, setApartment] = useState(currentAddress.apartment || '');
  const [neighborhood, setNeighborhood] = useState<SmtNeighborhood>(currentAddress.neighborhood);
  const [instructions, setInstructions] = useState(currentAddress.instructions || '');

  const [paymentMethod, setPaymentMethod] = useState<'mercadopago' | 'tarjeta_online' | 'efectivo_entrega' | 'transferencia'>('mercadopago');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Price calculations
  const subtotal = cart.reduce((acc, ci) => acc + ci.product.price * ci.quantity, 0);
  const deliveryFee = store ? store.deliveryFee : 1400;
  const serviceFee = 450;
  const total = subtotal + deliveryFee + serviceFee;

  const handleSubmitOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!street.trim() || !number.trim()) {
      setErrorMessage('Por favor ingresá la calle y número de entrega en San Miguel de Tucumán.');
      return;
    }

    if (!customerPhone.trim()) {
      setErrorMessage('El teléfono de contacto es necesario para que el cadete pueda coordinar la entrega.');
      return;
    }

    try {
      setIsSubmitting(true);

      // Verify availability via API first as required
      const productIds = cart.map((c) => c.product.id);
      const availability = await SaborTucApi.checkAvailability(storeId || '', productIds);

      if (!availability.restaurantOpen) {
        setErrorMessage('El establecimiento cerró recientemente para nuevos pedidos. Por favor seleccioná otro local.');
        setIsSubmitting(false);
        return;
      }

      if (availability.unavailableProducts.length > 0) {
        setErrorMessage('Algunos productos del carrito se han quedado sin stock en cocina. Por favor actualizá tu carrito.');
        setIsSubmitting(false);
        return;
      }

      // Create Order payload
      const orderPayload = {
        customer: {
          name: customerName,
          phone: customerPhone,
          email: customerEmail,
        },
        deliveryAddress: {
          id: `addr-${Date.now()}`,
          alias: 'Dirección de pedido',
          street,
          number,
          apartment: apartment.trim() || undefined,
          neighborhood,
          instructions: instructions.trim() || undefined,
          city: 'San Miguel de Tucumán' as const,
          isDefault: true,
        },
        restaurantId: storeId || 'store-smt',
        restaurantName: store ? store.name : 'Establecimiento SMT',
        items: cart.map((ci) => ({
          productId: ci.product.id,
          name: ci.product.name,
          price: ci.product.price,
          quantity: ci.quantity,
          notes: ci.notes,
        })),
        subtotal,
        deliveryFee,
        serviceFee,
        discount: 0,
        total,
        paymentMethod,
        estimatedDeliveryTime: store ? store.estimatedDeliveryTime : '30-45 min',
      };

      // Call API
      const createdOrder = await SaborTucApi.createOrder(orderPayload);
      setIsSubmitting(false);
      // Pago online: abrir la pasarela de Mercado Pago en otra pestaña
      if (createdOrder.paymentUrl) window.open(createdOrder.paymentUrl, '_blank', 'noopener');
      onOrderCreated(createdOrder);
    } catch (err: any) {
      setIsSubmitting(false);
      setErrorMessage(err?.message || 'Ocurrió un error al procesar el pedido con el servidor. Intente nuevamente.');
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Top back */}
      <button
        type="button"
        onClick={onBackToCart}
        className="mb-4 inline-flex items-center gap-1.5 text-xs font-bold text-stone-600 hover:text-stone-900 transition-colors cursor-pointer"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Volver al carrito</span>
      </button>

      <div className="border-b border-stone-200 pb-4 mb-8">
        <h1 className="text-2xl sm:text-3xl font-black text-stone-900 tracking-tight">
          Confirmación y Checkout del Pedido
        </h1>
        <p className="text-xs sm:text-sm text-stone-500 mt-1">
          Completá los datos de entrega en San Miguel de Tucumán y seleccioná tu medio de pago.
        </p>
      </div>

      {errorMessage && (
        <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-xs text-red-800 flex items-start gap-3">
          <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
          <div>{errorMessage}</div>
        </div>
      )}

      <form onSubmit={handleSubmitOrder} className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Delivery Form & Payment */}
        <div className="lg:col-span-7 flex flex-col gap-6">
          {/* Step 1: Dirección en SMT */}
          <div className="bg-white rounded-2xl border border-stone-200 p-6 shadow-xs">
            <div className="flex items-center gap-2 mb-4 pb-3 border-b border-stone-100">
              <span className="p-1.5 bg-red-50 text-red-700 rounded-lg">
                <MapPin className="w-4 h-4" />
              </span>
              <div>
                <h3 className="font-bold text-stone-900 text-sm">
                  Dirección de Entrega (San Miguel de Tucumán)
                </h3>
                <p className="text-[11px] text-stone-500">
                  Cadetería con entrega directa dentro de las cuatro avenidas y barrios aledaños
                </p>
              </div>
            </div>

            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block font-bold text-stone-700 mb-1">Calle *</label>
                  <input
                    type="text"
                    required
                    value={street}
                    onChange={(e) => setStreet(e.target.value)}
                    placeholder="Ej: Virgen de la Merced, 25 de Mayo, Laprida"
                    className="w-full p-2.5 rounded-lg border border-stone-200 text-xs focus:outline-none focus:border-stone-400"
                  />
                </div>
                <div>
                  <label className="block font-bold text-stone-700 mb-1">Número *</label>
                  <input
                    type="text"
                    required
                    value={number}
                    onChange={(e) => setNumber(e.target.value)}
                    placeholder="Ej: 420"
                    className="w-full p-2.5 rounded-lg border border-stone-200 text-xs focus:outline-none focus:border-stone-400"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-stone-700 mb-1">Piso / Depto / Timbre (opcional)</label>
                  <input
                    type="text"
                    value={apartment}
                    onChange={(e) => setApartment(e.target.value)}
                    placeholder="Ej: 4B (timbre Berdú)"
                    className="w-full p-2.5 rounded-lg border border-stone-200 text-xs focus:outline-none focus:border-stone-400"
                  />
                </div>
                <div>
                  <label className="block font-bold text-stone-700 mb-1">Barrio en SMT *</label>
                  <select
                    value={neighborhood}
                    onChange={(e) => setNeighborhood(e.target.value as any)}
                    className="w-full p-2.5 rounded-lg border border-stone-200 text-xs bg-stone-50 focus:outline-none"
                  >
                    <option value="Barrio Norte">Barrio Norte</option>
                    <option value="Centro">Centro</option>
                    <option value="Barrio Sur">Barrio Sur</option>
                    <option value="Plaza Independencia">Plaza Independencia</option>
                    <option value="Centro Histórico">Centro Histórico</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-stone-700 mb-1">
                  Instrucciones para el cadete en moto (opcional)
                </label>
                <input
                  type="text"
                  value={instructions}
                  onChange={(e) => setInstructions(e.target.value)}
                  placeholder="Ej: Portón verde, tocar timbre y esperar en vereda"
                  className="w-full p-2.5 rounded-lg border border-stone-200 text-xs focus:outline-none focus:border-stone-400"
                />
              </div>
            </div>
          </div>

          {/* Step 2: Datos de Contacto */}
          <div className="bg-white rounded-2xl border border-stone-200 p-6 shadow-xs">
            <h3 className="font-bold text-stone-900 text-sm mb-4 pb-3 border-b border-stone-100">
              Datos del Destinatario
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block font-bold text-stone-700 mb-1">Nombre completo *</label>
                <input
                  type="text"
                  required
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full p-2.5 rounded-lg border border-stone-200 text-xs focus:outline-none focus:border-stone-400"
                />
              </div>
              <div>
                <label className="block font-bold text-stone-700 mb-1">Teléfono móvil en Tucumán *</label>
                <input
                  type="text"
                  required
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  placeholder="+54 381 15..."
                  className="w-full p-2.5 rounded-lg border border-stone-200 text-xs focus:outline-none focus:border-stone-400"
                />
              </div>
            </div>
          </div>

          {/* Step 3: Método de Pago */}
          <div className="bg-white rounded-2xl border border-stone-200 p-6 shadow-xs">
            <h3 className="font-bold text-stone-900 text-sm mb-4 pb-3 border-b border-stone-100 flex items-center gap-1.5">
              <CreditCard className="w-4 h-4 text-stone-500" />
              <span>Método de Pago</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label
                className={`p-3.5 rounded-xl border text-xs cursor-pointer flex items-start gap-3 transition-all ${
                  paymentMethod === 'mercadopago'
                    ? 'border-stone-900 bg-stone-50 ring-1 ring-stone-900'
                    : 'border-stone-200 hover:border-stone-300'
                }`}
              >
                <input
                  type="radio"
                  name="payment"
                  checked={paymentMethod === 'mercadopago'}
                  onChange={() => setPaymentMethod('mercadopago')}
                  className="mt-0.5 accent-stone-900"
                />
                <div>
                  <div className="font-bold text-stone-900">Mercado Pago Online</div>
                  <div className="text-[11px] text-stone-500 mt-0.5">
                    Saldo en cuenta, débito o crédito en cuotas
                  </div>
                </div>
              </label>

              <label
                className={`p-3.5 rounded-xl border text-xs cursor-pointer flex items-start gap-3 transition-all ${
                  paymentMethod === 'efectivo_entrega'
                    ? 'border-stone-900 bg-stone-50 ring-1 ring-stone-900'
                    : 'border-stone-200 hover:border-stone-300'
                }`}
              >
                <input
                  type="radio"
                  name="payment"
                  checked={paymentMethod === 'efectivo_entrega'}
                  onChange={() => setPaymentMethod('efectivo_entrega')}
                  className="mt-0.5 accent-stone-900"
                />
                <div>
                  <div className="font-bold text-stone-900">Efectivo al Cadete</div>
                  <div className="text-[11px] text-stone-500 mt-0.5">
                    Abonás con billetes al recibir tu comida
                  </div>
                </div>
              </label>

              <label
                className={`p-3.5 rounded-xl border text-xs cursor-pointer flex items-start gap-3 transition-all ${
                  paymentMethod === 'tarjeta_online'
                    ? 'border-stone-900 bg-stone-50 ring-1 ring-stone-900'
                    : 'border-stone-200 hover:border-stone-300'
                }`}
              >
                <input
                  type="radio"
                  name="payment"
                  checked={paymentMethod === 'tarjeta_online'}
                  onChange={() => setPaymentMethod('tarjeta_online')}
                  className="mt-0.5 accent-stone-900"
                />
                <div>
                  <div className="font-bold text-stone-900">Tarjeta Débito / Crédito</div>
                  <div className="text-[11px] text-stone-500 mt-0.5">
                    Procesamiento seguro bancario directo
                  </div>
                </div>
              </label>

              <label
                className={`p-3.5 rounded-xl border text-xs cursor-pointer flex items-start gap-3 transition-all ${
                  paymentMethod === 'transferencia'
                    ? 'border-stone-900 bg-stone-50 ring-1 ring-stone-900'
                    : 'border-stone-200 hover:border-stone-300'
                }`}
              >
                <input
                  type="radio"
                  name="payment"
                  checked={paymentMethod === 'transferencia'}
                  onChange={() => setPaymentMethod('transferencia')}
                  className="mt-0.5 accent-stone-900"
                />
                <div>
                  <div className="font-bold text-stone-900">Transferencia / Alias</div>
                  <div className="text-[11px] text-stone-500 mt-0.5">
                    Alias oficial: sabortuc.mp
                  </div>
                </div>
              </label>
            </div>
          </div>
        </div>

        {/* Right Column: Order Summary & API Confirmation */}
        <aside className="lg:col-span-5 bg-white rounded-2xl border border-stone-200 p-6 shadow-sm sticky top-24">
          <h3 className="font-extrabold text-stone-900 text-base pb-3 border-b border-stone-100 mb-4">
            Resumen de Facturación
          </h3>

          <div className="text-xs text-stone-500 mb-3">
            <span className="font-bold text-stone-900">Comercio:</span> {store?.name || 'SMT'} (
            {store?.neighborhood})
          </div>

          <div className="max-h-52 overflow-y-auto divide-y divide-stone-100 mb-4 pr-1">
            {cart.map((ci) => (
              <div key={ci.product.id} className="py-2.5 flex justify-between text-xs">
                <div className="pr-2">
                  <div className="font-bold text-stone-800">
                    {ci.quantity}x {ci.product.name}
                  </div>
                  {ci.notes && (
                    <div className="text-[10px] text-stone-400">"{ci.notes}"</div>
                  )}
                </div>
                <div className="font-bold text-stone-900 shrink-0">
                  ${(ci.product.price * ci.quantity).toLocaleString('es-AR')}
                </div>
              </div>
            ))}
          </div>

          <div className="space-y-2 text-xs text-stone-600 pt-3 border-t border-stone-100 mb-4">
            <div className="flex justify-between">
              <span>Subtotal comanda</span>
              <span className="font-bold text-stone-900">${subtotal.toLocaleString('es-AR')}</span>
            </div>
            <div className="flex justify-between">
              <span>Costo de envío cadete</span>
              <span className="font-bold text-stone-900">${deliveryFee.toLocaleString('es-AR')}</span>
            </div>
            <div className="flex justify-between">
              <span>Tasa operativa de plataforma</span>
              <span className="font-bold text-stone-900">${serviceFee.toLocaleString('es-AR')}</span>
            </div>
            <div className="pt-3 border-t border-stone-100 flex justify-between text-base font-black text-stone-900">
              <span>Total a Abonar</span>
              <span className="text-red-700 text-xl font-black">${total.toLocaleString('es-AR')}</span>
            </div>
          </div>

          {/* API Submit button */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3.5 px-4 rounded-xl bg-stone-900 hover:bg-stone-800 text-white font-extrabold text-xs transition-colors flex items-center justify-center gap-2 shadow-xs cursor-pointer disabled:opacity-50"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Enviando pedido a la API...</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Confirmar y Enviar Pedido</span>
              </>
            )}
          </button>

          <div className="mt-4 flex items-center gap-2 justify-center text-[11px] text-stone-400 text-center">
            <ShieldCheck className="w-3.5 h-3.5 text-stone-400 shrink-0" />
            <span>Al confirmar, la orden se envía directamente a la cocina de {store?.name}</span>
          </div>
        </aside>
      </form>
    </div>
  );
};
