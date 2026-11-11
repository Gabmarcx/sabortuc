import React, { useState, useEffect } from 'react';
import { Order, OrderStatus } from '../types';
import { SaborTucApi } from '../services/api';
import {
  Clock,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  ArrowLeft,
  Home,
  PackageCheck,
  RefreshCw,
  ShoppingBag,
} from 'lucide-react';

interface OrdersHistoryScreenProps {
  onTrackOrder: (orderId: string) => void;
  onExplore: () => void;
}

export const OrdersHistoryScreen: React.FC<OrdersHistoryScreenProps> = ({
  onTrackOrder,
  onExplore,
}) => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<'todos' | 'activos' | 'finalizados'>('todos');

  const loadOrders = async () => {
    setLoading(true);
    const list = await SaborTucApi.getOrders();
    setOrders(list);
    setLoading(false);
  };

  useEffect(() => {
    loadOrders();
  }, []);

  const getStatusBadge = (status: OrderStatus) => {
    switch (status) {
      case 'recibido':
        return <span className="bg-stone-100 text-stone-800 font-bold px-2 py-0.5 rounded text-[11px]">Recibido</span>;
      case 'confirmado':
        return <span className="bg-sky-50 text-sky-800 border border-sky-200 font-bold px-2 py-0.5 rounded text-[11px]">Confirmado</span>;
      case 'en_preparacion':
        return <span className="bg-amber-50 text-amber-800 border border-amber-200 font-bold px-2 py-0.5 rounded text-[11px]">En preparación</span>;
      case 'en_camino':
        return <span className="bg-red-50 text-red-800 border border-red-200 font-bold px-2 py-0.5 rounded text-[11px] animate-pulse">En camino</span>;
      case 'entregado':
        return <span className="bg-emerald-50 text-emerald-800 border border-emerald-200 font-bold px-2 py-0.5 rounded text-[11px]">Entregado</span>;
      case 'cancelado':
        return <span className="bg-stone-200 text-stone-600 font-bold px-2 py-0.5 rounded text-[11px]">Cancelado</span>;
    }
  };

  const filtered = orders.filter((o) => {
    if (filterStatus === 'activos') {
      return o.status !== 'entregado' && o.status !== 'cancelado';
    }
    if (filterStatus === 'finalizados') {
      return o.status === 'entregado' || o.status === 'cancelado';
    }
    return true;
  });

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Return to Home button */}
      <div className="mb-4 flex items-center justify-between">
        <button
          onClick={onExplore}
          className="inline-flex items-center gap-2 text-xs font-bold text-stone-800 hover:text-red-700 bg-white hover:bg-stone-50 px-3.5 py-2 rounded-xl border border-stone-200 shadow-xs transition-all cursor-pointer group"
          title="Volver a la pantalla principal"
        >
          <Home className="w-4 h-4 text-stone-500 group-hover:text-red-700 transition-colors" />
          <span className="text-stone-300">|</span>
          <ArrowLeft className="w-3.5 h-3.5 text-stone-400 group-hover:text-red-700 transition-colors" />
          <span>Volver al inicio</span>
        </button>

        <span className="text-[11px] text-stone-500 hidden sm:inline">
          Navegación / <strong className="text-stone-800">Historial de Pedidos</strong>
        </span>
      </div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-200 pb-5 mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-stone-900 tracking-tight">
            Historial de Pedidos
          </h1>
          <p className="text-xs sm:text-sm text-stone-500 mt-0.5">
            Consulta de comandas y estado de entregas en San Miguel de Tucumán
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadOrders}
            className="p-2 rounded-lg border border-stone-200 bg-white text-stone-600 hover:text-stone-900 text-xs flex items-center gap-1.5 cursor-pointer"
            title="Refrescar desde API"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Actualizar</span>
          </button>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex items-center gap-2 mb-6 border-b border-stone-200 pb-2">
        <button
          onClick={() => setFilterStatus('todos')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer ${
            filterStatus === 'todos'
              ? 'bg-stone-900 text-white'
              : 'text-stone-600 hover:bg-stone-100'
          }`}
        >
          Todos ({orders.length})
        </button>
        <button
          onClick={() => setFilterStatus('activos')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer ${
            filterStatus === 'activos'
              ? 'bg-stone-900 text-white'
              : 'text-stone-600 hover:bg-stone-100'
          }`}
        >
          En Curso ({orders.filter((o) => o.status !== 'entregado' && o.status !== 'cancelado').length})
        </button>
        <button
          onClick={() => setFilterStatus('finalizados')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer ${
            filterStatus === 'finalizados'
              ? 'bg-stone-900 text-white'
              : 'text-stone-600 hover:bg-stone-100'
          }`}
        >
          Entregados ({orders.filter((o) => o.status === 'entregado').length})
        </button>
      </div>

      {/* Orders List */}
      {loading ? (
        <div className="py-20 text-center text-xs text-stone-500">
          Cargando pedidos desde la API de SaborTUC...
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-stone-200 p-12 text-center">
          <PackageCheck className="w-10 h-10 text-stone-300 mx-auto mb-3" />
          <h3 className="text-base font-bold text-stone-900">No hay pedidos registrados</h3>
          <p className="text-xs text-stone-500 mt-1 max-w-sm mx-auto">
            Cuando crees un pedido de empanadas, pizzas o café en SMT, vas a poder consultar el estado de entrega aquí.
          </p>
          <button
            onClick={onExplore}
            className="mt-5 px-5 py-2.5 rounded-xl bg-stone-900 text-white text-xs font-bold hover:bg-stone-800 transition-colors cursor-pointer inline-flex items-center gap-2"
          >
            <Home className="w-3.5 h-3.5" />
            <span>Volver al inicio a explorar locales</span>
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((order) => {
            const dateStr = new Date(order.createdAt).toLocaleDateString('es-AR', {
              day: 'numeric',
              month: 'short',
              hour: '2-digit',
              minute: '2-digit',
            });

            return (
              <div
                key={order.id}
                className="bg-white rounded-2xl border border-stone-200 p-5 shadow-xs hover:border-stone-300 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <span className="font-mono text-xs font-extrabold text-stone-900">
                      {order.id}
                    </span>
                    {getStatusBadge(order.status)}
                    {order.isDemoOrder && (
                      <span className="text-[10px] text-stone-500 bg-stone-100 border border-stone-200 px-1.5 py-0.2 rounded font-medium">
                        Ejemplo de demostración
                      </span>
                    )}
                    <span className="text-xs text-stone-400">· {dateStr}</span>
                  </div>

                  <h3 className="font-bold text-stone-900 text-base">
                    {order.restaurantName}
                  </h3>

                  <div className="text-xs text-stone-600 mt-1 line-clamp-1">
                    {order.items.map((it) => `${it.quantity}x ${it.name}`).join(' · ')}
                  </div>

                  <div className="text-xs text-stone-500 mt-1">
                    📍 Entrega en {order.deliveryAddress.street} {order.deliveryAddress.number} ({order.deliveryAddress.neighborhood}, SMT)
                  </div>
                </div>

                {/* Right price and actions */}
                <div className="flex items-center justify-between md:flex-col md:items-end gap-3 pt-3 md:pt-0 border-t md:border-t-0 border-stone-100">
                  <div className="text-left md:text-right">
                    <div className="text-[11px] text-stone-400 font-medium">Total abonado</div>
                    <div className="text-base font-black text-stone-900">
                      ${order.total.toLocaleString('es-AR')}
                    </div>
                  </div>

                  <button
                    onClick={() => onTrackOrder(order.id)}
                    className="py-2 px-4 rounded-xl bg-stone-900 hover:bg-stone-800 text-white text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <span>Seguimiento</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
