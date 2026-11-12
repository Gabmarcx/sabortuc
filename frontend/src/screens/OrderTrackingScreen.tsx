import React, { useState, useEffect } from 'react';
import { Order, OrderStatus } from '../types';
import { SaborTucApi } from '../services/api';
import {
  Clock,
  MapPin,
  CheckCircle2,
  AlertCircle,
  ArrowLeft,
  Home,
  Bike,
  Flame,
  ChefHat,
  Package,
  Phone,
  RefreshCw,
} from 'lucide-react';

interface OrderTrackingScreenProps {
  orderId: string;
  onBackToOrders: () => void;
  onExplore: () => void;
}

const STEPS: { status: OrderStatus; label: string; icon: any }[] = [
  { status: 'recibido', label: 'Recibido', icon: Package },
  { status: 'confirmado', label: 'Confirmado', icon: CheckCircle2 },
  { status: 'en_preparacion', label: 'En Preparación', icon: ChefHat },
  { status: 'en_camino', label: 'En Camino', icon: Bike },
  { status: 'entregado', label: 'Entregado', icon: CheckCircle2 },
];

export const OrderTrackingScreen: React.FC<OrderTrackingScreenProps> = ({
  orderId,
  onBackToOrders,
  onExplore,
}) => {
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchOrder = async () => {
    setLoading(true);
    const data = await SaborTucApi.getOrderStatus(orderId);
    setOrder(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchOrder();

    // Polling simulation every 15 seconds to simulate API status polling
    const interval = setInterval(async () => {
      const data = await SaborTucApi.getOrderStatus(orderId);
      if (data) setOrder(data);
    }, 15000);

    return () => clearInterval(interval);
  }, [orderId]);

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center text-xs text-stone-500">
        Consultando estado del pedido {orderId} en la API de SaborTUC...
      </div>
    );
  }

  if (!order) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center">
        <h2 className="text-lg font-bold text-stone-900">Pedido no encontrado</h2>
        <p className="text-xs text-stone-500 mt-1">
          No se encontró la comanda con ID {orderId}.
        </p>
        <div className="mt-4 flex items-center justify-center gap-2">
          <button
            onClick={onExplore}
            className="px-4 py-2 rounded-lg bg-stone-900 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
          >
            <Home className="w-3.5 h-3.5" />
            <span>Volver al inicio</span>
          </button>
          <button
            onClick={onBackToOrders}
            className="px-4 py-2 rounded-lg border border-stone-200 bg-white text-stone-800 text-xs font-bold cursor-pointer"
          >
            Volver a Mis Pedidos
          </button>
        </div>
      </div>
    );
  }

  const currentStepIndex = STEPS.findIndex((s) => s.status === order.status);

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Top navigation */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6 border-b border-stone-200 pb-4">
        <div className="flex items-center gap-2">
          <button
            onClick={onExplore}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-stone-800 hover:text-red-700 bg-white hover:bg-stone-50 px-3.5 py-2 rounded-xl border border-stone-200 shadow-xs transition-colors cursor-pointer group"
            title="Volver a la pantalla principal"
          >
            <Home className="w-4 h-4 text-stone-500 group-hover:text-red-700 transition-colors" />
            <span className="text-stone-300">|</span>
            <span>Volver al inicio</span>
          </button>

          <button
            onClick={onBackToOrders}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-stone-600 hover:text-stone-900 bg-white hover:bg-stone-50 px-3 py-2 rounded-xl border border-stone-200 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Mis pedidos</span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchOrder}
            className="p-1.5 rounded-lg border border-stone-200 bg-white text-stone-600 hover:text-stone-900"
            title="Refrescar estado"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Main Order Card Banner */}
      <div className="bg-white rounded-2xl border border-stone-200 p-6 sm:p-8 shadow-sm mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-stone-100">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="font-mono text-xs font-extrabold text-stone-900 bg-stone-100 px-2.5 py-1 rounded border border-stone-200">
                {order.id}
              </span>
              {order.isDemoOrder && (
                <span className="text-[10px] text-stone-500 bg-stone-50 border border-stone-200 px-2 py-0.5 rounded font-medium">
                  Pedido de demostración para pruebas
                </span>
              )}
            </div>
            <h1 className="text-2xl font-black text-stone-900 mt-2">
              {order.restaurantName}
            </h1>
            <p className="text-xs text-stone-500 mt-0.5">
              Destino: {order.deliveryAddress.street} {order.deliveryAddress.number} ({order.deliveryAddress.neighborhood}, SMT)
            </p>
          </div>

          <div className="text-left sm:text-right bg-stone-50 p-3.5 rounded-xl border border-stone-200">
            <div className="text-[11px] font-bold text-stone-500 uppercase tracking-wider">
              Tiempo estimado de entrega
            </div>
            <div className="text-2xl font-black text-stone-900 mt-0.5">
              {order.status === 'entregado' ? 'Entregado' : order.estimatedDeliveryTime}
            </div>
            <div className="text-[11px] text-stone-400">
              {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} hs
            </div>
          </div>
        </div>

        {/* Stepper Progress Bar */}
        <div className="py-8">
          <div className="grid grid-cols-5 gap-2 relative">
            {STEPS.map((stepItem, index) => {
              const isPastOrCurrent = index <= currentStepIndex;
              const isCurrent = index === currentStepIndex;
              const Icon = stepItem.icon;

              return (
                <div key={stepItem.status} className="flex flex-col items-center text-center relative z-10">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center text-xs font-bold transition-all shadow-xs ${
                      isCurrent
                        ? 'bg-red-700 text-white ring-4 ring-red-100 scale-110'
                        : isPastOrCurrent
                        ? 'bg-stone-900 text-white'
                        : 'bg-stone-100 text-stone-400'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                  </div>
                  <div
                    className={`text-xs font-bold mt-2.5 truncate max-w-full ${
                      isCurrent
                        ? 'text-red-700'
                        : isPastOrCurrent
                        ? 'text-stone-900'
                        : 'text-stone-400'
                    }`}
                  >
                    {stepItem.label}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Status History Timeline */}
        <div className="pt-6 border-t border-stone-100">
          <h3 className="font-bold text-stone-900 text-sm mb-4">
            Historial de Cambios de Estado (API Audit Log)
          </h3>
          <div className="space-y-3">
            {order.statusHistory.map((item, idx) => (
              <div key={idx} className="flex items-start gap-3 text-xs">
                <span className="font-mono text-stone-400 text-[11px] shrink-0 pt-0.5">
                  {item.timestamp}
                </span>
                <div className="w-2 h-2 rounded-full bg-stone-900 mt-1.5 shrink-0" />
                <div className="flex-1">
                  <span className="font-bold text-stone-900 capitalize">
                    {item.status.replace('_', ' ')}:
                  </span>{' '}
                  <span className="text-stone-600">{item.description}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Order Details & Summary Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
        {/* Products Breakdown */}
        <div className="md:col-span-7 bg-white rounded-2xl border border-stone-200 p-6 shadow-xs">
          <h3 className="font-bold text-stone-900 text-sm mb-4 pb-3 border-b border-stone-100">
            Productos de la Comanda
          </h3>

          <div className="divide-y divide-stone-100">
            {order.items.map((it, idx) => (
              <div key={idx} className="py-3 flex justify-between items-center text-xs">
                <div>
                  <div className="font-bold text-stone-900">
                    {it.quantity}x {it.name}
                  </div>
                  {it.notes && (
                    <div className="text-[11px] text-stone-500 italic mt-0.5">
                      "{it.notes}"
                    </div>
                  )}
                </div>
                <div className="font-black text-stone-900">
                  ${(it.price * it.quantity).toLocaleString('es-AR')}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 pt-4 border-t border-stone-100 space-y-2 text-xs text-stone-600">
            <div className="flex justify-between">
              <span>Subtotal comanda</span>
              <span className="font-bold text-stone-900">${order.subtotal.toLocaleString('es-AR')}</span>
            </div>
            <div className="flex justify-between">
              <span>Costo de cadete (SMT)</span>
              <span className="font-bold text-stone-900">${order.deliveryFee.toLocaleString('es-AR')}</span>
            </div>
            <div className="flex justify-between">
              <span>Tasa de plataforma</span>
              <span className="font-bold text-stone-900">${order.serviceFee.toLocaleString('es-AR')}</span>
            </div>
            <div className="pt-3 border-t border-stone-100 flex justify-between text-base font-black text-stone-900">
              <span>Total Abonado</span>
              <span className="text-red-700 text-lg font-black">${order.total.toLocaleString('es-AR')}</span>
            </div>
          </div>
        </div>

        {/* Delivery and Customer Info */}
        <div className="md:col-span-5 flex flex-col gap-4">
          <div className="bg-white rounded-2xl border border-stone-200 p-6 shadow-xs">
            <h3 className="font-bold text-stone-900 text-sm mb-3">Dirección de Entrega en SMT</h3>
            <div className="flex items-start gap-2 text-xs text-stone-700">
              <MapPin className="w-4 h-4 text-red-700 shrink-0 mt-0.5" />
              <div>
                <div className="font-bold text-stone-900">
                  {order.deliveryAddress.street} {order.deliveryAddress.number}
                  {order.deliveryAddress.apartment ? ` (Depto ${order.deliveryAddress.apartment})` : ''}
                </div>
                <div className="text-stone-500">{order.deliveryAddress.neighborhood}, San Miguel de Tucumán</div>
                {order.deliveryAddress.instructions && (
                  <div className="text-[11px] text-stone-500 bg-stone-50 p-2 rounded mt-2 border border-stone-100">
                    Instrucciones: "{order.deliveryAddress.instructions}"
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-stone-200 p-6 shadow-xs">
            <h3 className="font-bold text-stone-900 text-sm mb-3">Medio de Pago</h3>
            <div className="text-xs text-stone-600">
              <span className="font-bold text-stone-900 capitalize">
                {order.paymentMethod.replace('_', ' ')}
              </span>{' '}
              · Estado:{' '}
              <span
                className={`font-bold ${
                  order.paymentStatus === 'aprobado'
                    ? 'text-emerald-700'
                    : order.paymentStatus === 'rechazado'
                    ? 'text-red-700'
                    : 'text-stone-700'
                }`}
              >
                {order.paymentStatus === 'aprobado'
                  ? 'Aprobado y registrado'
                  : order.paymentStatus === 'rechazado'
                  ? 'Pago rechazado'
                  : order.paymentMethod === 'mercadopago' || order.paymentMethod === 'tarjeta_online'
                  ? 'Pendiente de pago'
                  : 'Cobro contra entrega'}
              </span>
              {order.paymentStatus === 'pendiente' && order.paymentUrl && (
                <a
                  href={order.paymentUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ml-2 font-bold text-red-700 underline"
                >
                  Completar pago
                </a>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
