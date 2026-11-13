import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { OperationsOrder, Restaurant } from '../types';
import { ApiError, SaborTucApi } from '../services/api';

type OperationsRole = 'restaurant' | 'courier';

const storageKey = (role: OperationsRole) => `sabortuc.operations.${role}.key`;
const restaurantStorageKey = 'sabortuc.operations.restaurant.id';
const money = (amount: number) => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(amount);
const formatDate = (value: string) => new Intl.DateTimeFormat('es-AR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(value));
const statusLabel = (status: string) => ({
  recibido: 'Recibido', confirmado: 'Confirmado', en_preparacion: 'En preparación',
  en_camino: 'En camino', entregado: 'Entregado', cancelado: 'Cancelado',
}[status] ?? status);
const paymentMethodLabel = (method: string) => ({
  mercadopago: 'Mercado Pago', tarjeta_online: 'Tarjeta online',
  efectivo_entrega: 'Efectivo al cadete', transferencia: 'Transferencia',
}[method] ?? method);
const paymentStatusLabel = (status: string) => ({ pendiente: 'Pendiente', aprobado: 'Aprobado', rechazado: 'Rechazado' }[status] ?? status);

function errorMessage(error: unknown) {
  if (error instanceof ApiError) return error.message;
  return error instanceof Error ? error.message : 'No se pudo completar la operación.';
}

export function OperationsScreen({ role }: { role: OperationsRole }) {
  const isRestaurant = role === 'restaurant';
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [restaurantId, setRestaurantId] = useState(() => sessionStorage.getItem(restaurantStorageKey) ?? '');
  const [courierRestaurants, setCourierRestaurants] = useState<{ id: string; name: string }[]>([]);
  const [courierRestaurantFilter, setCourierRestaurantFilter] = useState('');
  const [draftKey, setDraftKey] = useState(() => sessionStorage.getItem(storageKey(role)) ?? '');
  const [activeKey, setActiveKey] = useState(() => {
    if (role === 'restaurant' && !sessionStorage.getItem(restaurantStorageKey)) {
      sessionStorage.removeItem(storageKey(role));
      return '';
    }
    return sessionStorage.getItem(storageKey(role)) ?? '';
  });
  const [orders, setOrders] = useState<OperationsOrder[]>([]);
  const [loading, setLoading] = useState(false);
  const [restaurantsLoading, setRestaurantsLoading] = useState(isRestaurant);
  const [actionOrderId, setActionOrderId] = useState<string | null>(null);
  const [error, setError] = useState('');

  const selectedRestaurant = useMemo(
    () => restaurants.find((item) => item.id === restaurantId),
    [restaurants, restaurantId]
  );

  const loadOrders = useCallback(async (key: string, selectedId = restaurantId) => {
    if (!key || (isRestaurant && !selectedId)) return;
    setLoading(true);
    setError('');
    try {
      const result = isRestaurant
        ? await SaborTucApi.getRestaurantOperationsOrders(selectedId, key)
        : await (async () => {
            const assigned = await SaborTucApi.getCourierRestaurants(key);
            setCourierRestaurants(assigned);
            return SaborTucApi.getCourierOperationsOrders(key);
          })();
      setOrders(result);
    } catch (e) {
      setError(errorMessage(e));
      if (e instanceof ApiError && e.status === 401) {
        setActiveKey('');
        sessionStorage.removeItem(storageKey(role));
      }
    } finally {
      setLoading(false);
    }
  }, [isRestaurant, restaurantId, role]);

  useEffect(() => {
    if (!isRestaurant) return;
    SaborTucApi.getRestaurantsForOperations()
      .then((items) => {
        setRestaurants(items);
        setRestaurantId((current) => {
          const stillExists = items.some((item) => item.id === current);
          const next = stillExists ? current : items[0]?.id || '';
          if (next) sessionStorage.setItem(restaurantStorageKey, next);
          return next;
        });
      })
      .catch((e) => setError(errorMessage(e)))
      .finally(() => setRestaurantsLoading(false));
  }, [isRestaurant]);

  useEffect(() => {
    if (activeKey && (!isRestaurant || restaurantId)) void loadOrders(activeKey, restaurantId);
  }, [activeKey, isRestaurant, loadOrders, restaurantId]);

  const handleLogin = async (event: FormEvent) => {
    event.preventDefault();
    const key = draftKey.trim();
    if (!key) {
      setError('Ingresá la clave de acceso del panel.');
      return;
    }
    if (isRestaurant && !restaurantId) {
      setError('No hay restaurantes disponibles para operar.');
      return;
    }
    setLoading(true);
    try {
      const result = isRestaurant
        ? await SaborTucApi.getRestaurantOperationsOrders(restaurantId, key)
        : await SaborTucApi.getCourierOperationsOrders(key);
      setOrders(result);
      sessionStorage.setItem(storageKey(role), key);
      if (isRestaurant) sessionStorage.setItem(restaurantStorageKey, restaurantId);
      setActiveKey(key);
      setError('');
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    sessionStorage.removeItem(storageKey(role));
    if (isRestaurant) sessionStorage.removeItem(restaurantStorageKey);
    setActiveKey('');
    setDraftKey('');
    setOrders([]);
    setCourierRestaurants([]);
    setCourierRestaurantFilter('');
    setError('');
  };

  const runAction = async (order: OperationsOrder, action: 'accept' | 'prepare' | 'dispatch' | 'deliver') => {
    if (!activeKey) return;
    if (isRestaurant && action === 'accept' && order.paymentMethod === 'transferencia' &&
      !window.confirm('¿Verificaste que la transferencia fue acreditada fuera del sistema?')) return;
    setActionOrderId(order.id);
    setError('');
    try {
      if (action === 'accept') await SaborTucApi.acceptRestaurantOrder(restaurantId, order.id, activeKey);
      if (action === 'prepare') await SaborTucApi.startOrderPreparation(restaurantId, order.id, activeKey);
      if (action === 'dispatch') await SaborTucApi.startOrderDelivery(order.id, activeKey);
      if (action === 'deliver') await SaborTucApi.markOrderDelivered(order.id, activeKey);
      await loadOrders(activeKey, restaurantId);
    } catch (e) {
      setError(errorMessage(e));
      await loadOrders(activeKey, restaurantId);
    } finally {
      setActionOrderId(null);
    }
  };

  const restaurantGroups = [
    { status: 'recibido', title: 'Nuevos pedidos' },
    { status: 'confirmado', title: 'Listos para preparar' },
    { status: 'en_preparacion', title: 'En cocina' },
  ];
  const courierGroups = [
    { status: 'en_preparacion', title: 'Para retirar' },
    { status: 'en_camino', title: 'En camino' },
  ];
  const groups = isRestaurant ? restaurantGroups : courierGroups;

  return (
    <main className="min-h-screen bg-stone-100 text-stone-900">
      <header className="bg-stone-950 text-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-5">
          <div>
            <a href="/" className="text-xs text-stone-300 hover:text-white">← Volver a SaborTUC</a>
            <h1 className="mt-2 text-2xl font-black">{isRestaurant ? 'Panel del restaurante' : 'Panel del cadete'}</h1>
            <p className="mt-1 text-sm text-stone-300">
              {isRestaurant ? 'Aceptá pedidos y comenzá su preparación.' : 'Retirá los pedidos preparados y registrá la entrega.'}
            </p>
          </div>
          {activeKey && <button onClick={logout} className="rounded-lg border border-stone-600 px-4 py-2 text-sm font-semibold hover:bg-stone-800">Cerrar sesión</button>}
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-4 py-6">
        {!activeKey ? (
          <section className="mx-auto max-w-lg rounded-2xl bg-white p-6 shadow-sm">
            <h2 className="text-lg font-bold">Acceso del {isRestaurant ? 'restaurante' : 'cadete'}</h2>
            <p className="mt-1 text-sm text-stone-600">Ingresá la clave configurada para este rol en el backend.</p>
            <form onSubmit={handleLogin} className="mt-5 space-y-4">
              {isRestaurant && (
                <label className="block text-sm font-semibold">
                  Restaurante
                  <select value={restaurantId} onChange={(e) => setRestaurantId(e.target.value)} disabled={restaurantsLoading}
                    className="mt-1 w-full rounded-lg border border-stone-300 bg-white px-3 py-2.5 font-normal">
                    {restaurants.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                  </select>
                </label>
              )}
              <label className="block text-sm font-semibold">
                Clave de acceso
                <input type="password" autoComplete="current-password" value={draftKey} onChange={(e) => setDraftKey(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2.5 font-normal" />
              </label>
              {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
              <button disabled={restaurantsLoading || loading || (isRestaurant && !restaurantId)}
                className="w-full rounded-lg bg-red-700 px-4 py-3 font-bold text-white hover:bg-red-800 disabled:opacity-50">
                {loading ? 'Verificando…' : 'Ingresar'}
              </button>
            </form>
          </section>
        ) : (
          <>
            <section className="mb-5 flex flex-wrap items-end justify-between gap-4 rounded-2xl bg-white p-4 shadow-sm">
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-stone-500">Bandeja operativa</p>
                <h2 className="mt-1 text-xl font-black">{isRestaurant ? selectedRestaurant?.name ?? 'Pedidos del restaurante' : 'Pedidos para reparto'}</h2>
                <p className="mt-1 text-sm text-stone-600">{orders.length} pedido{orders.length === 1 ? '' : 's'} en esta bandeja</p>
              </div>
              <div className="flex items-center gap-2">
                {!isRestaurant && (
                  <select value={courierRestaurantFilter} onChange={(e) => setCourierRestaurantFilter(e.target.value)}
                    className="rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm">
                    <option value="">Todos mis restaurantes</option>
                    {courierRestaurants.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                  </select>
                )}
                <button onClick={() => void loadOrders(activeKey, restaurantId)} disabled={loading}
                  className="rounded-lg border border-stone-300 px-4 py-2 text-sm font-semibold hover:bg-stone-50 disabled:opacity-50">
                  {loading ? 'Actualizando…' : 'Actualizar'}
                </button>
              </div>
            </section>

            {!isRestaurant && (
              <section className="mb-5 rounded-2xl bg-white p-4 shadow-sm">
                <h3 className="text-sm font-bold">Restaurantes asignados a este cadete</h3>
                <div className="mt-2 flex flex-wrap gap-2">
                  {courierRestaurants.map((item) => <span key={item.id} className="rounded-full bg-stone-100 px-3 py-1 text-sm">{item.name}</span>)}
                </div>
              </section>
            )}

            {error && <p role="alert" className="mb-5 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}

            <div className="space-y-7">
              {groups.map((group) => {
                const groupOrders = orders.filter((order) => order.status === group.status &&
                  (!isRestaurant && courierRestaurantFilter ? order.restaurantId === courierRestaurantFilter : true));
                return (
                  <section key={group.status}>
                    <div className="mb-3 flex items-center gap-2">
                      <h3 className="text-lg font-black">{group.title}</h3>
                      <span className="rounded-full bg-stone-200 px-2.5 py-0.5 text-xs font-bold">{groupOrders.length}</span>
                    </div>
                    {groupOrders.length === 0 ? (
                      <p className="rounded-xl border border-dashed border-stone-300 bg-white/60 p-5 text-sm text-stone-500">No hay pedidos en esta etapa.</p>
                    ) : (
                      <div className="grid gap-4 lg:grid-cols-2">
                        {groupOrders.map((order) => {
                          const online = order.paymentMethod === 'mercadopago' || order.paymentMethod === 'tarjeta_online';
                          const waitingPayment = online && order.paymentStatus !== 'aprobado';
                          const busy = actionOrderId === order.id;
                          let action: 'accept' | 'prepare' | 'dispatch' | 'deliver' | null = null;
                          let actionLabel = '';
                          if (isRestaurant && order.status === 'recibido' && !waitingPayment) { action = 'accept'; actionLabel = 'Aceptar pedido'; }
                          if (isRestaurant && order.status === 'confirmado') { action = 'prepare'; actionLabel = 'Iniciar preparación'; }
                          if (!isRestaurant && order.status === 'en_preparacion') { action = 'dispatch'; actionLabel = 'Marcar en camino'; }
                          if (!isRestaurant && order.status === 'en_camino') { action = 'deliver'; actionLabel = 'Marcar entregado'; }
                          return (
                            <article key={order.id} className="overflow-hidden rounded-2xl bg-white shadow-sm">
                              <div className="flex flex-wrap items-start justify-between gap-3 border-b border-stone-100 p-4">
                                <div>
                                  <p className="font-black">{order.id}</p>
                                  <p className="mt-1 text-xs text-stone-500">{formatDate(order.createdAt)} · {order.restaurantName}</p>
                                </div>
                                <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-900">{statusLabel(order.status)}</span>
                              </div>
                              <div className="space-y-4 p-4">
                                <div>
                                  <h4 className="text-xs font-bold uppercase tracking-wide text-stone-500">Comanda</h4>
                                  <ul className="mt-2 space-y-1 text-sm">
                                    {order.items.map((item) => <li key={item.productId}>{item.quantity}× {item.name}{item.notes ? ` — ${item.notes}` : ''}</li>)}
                                  </ul>
                                  <p className="mt-2 text-sm font-bold">Total: {money(order.total)}</p>
                                </div>
                                <div className="rounded-lg bg-stone-50 p-3 text-sm">
                                  <p className="font-bold">{order.customerName} · {order.customerPhone}</p>
                                  <p>{order.street} {order.number}{order.apartment ? `, ${order.apartment}` : ''}, {order.neighborhood}</p>
                                  {order.instructions && <p className="mt-1 text-stone-600">Indicaciones: {order.instructions}</p>}
                                  {order.distanceKm != null && <p className="mt-1 text-xs text-stone-500">Distancia estimada: {order.distanceKm.toFixed(1)} km{order.routeDurationMin != null ? ` · ${order.routeDurationMin} min` : ''}</p>}
                                </div>
                                <p className="text-xs text-stone-600">
                                  Pago: <b>{paymentMethodLabel(order.paymentMethod)}</b> · Estado: <b>{paymentStatusLabel(order.paymentStatus)}</b>
                                </p>
                                {isRestaurant && order.paymentMethod === 'transferencia' && order.status === 'recibido' &&
                                  <p className="rounded-lg bg-blue-50 p-3 text-xs text-blue-900">La transferencia debe verificarse manualmente antes de aceptar el pedido.</p>}
                                {waitingPayment && <p className="rounded-lg bg-amber-50 p-3 text-xs text-amber-900">Esperando la aprobación del pago online. El restaurante no puede iniciar el pedido todavía.</p>}
                                {action ? (
                                  <button onClick={() => void runAction(order, action!)} disabled={busy || actionOrderId !== null}
                                    className="w-full rounded-lg bg-stone-950 px-4 py-3 text-sm font-bold text-white hover:bg-stone-800 disabled:opacity-50">
                                    {busy ? 'Guardando…' : actionLabel}
                                  </button>
                                ) : order.status === 'en_preparacion' && isRestaurant ? (
                                  <p className="text-center text-sm font-semibold text-stone-500">Esperando retiro del cadete.</p>
                                ) : null}
                              </div>
                            </article>
                          );
                        })}
                      </div>
                    )}
                  </section>
                );
              })}
            </div>
          </>
        )}
      </div>
    </main>
  );
}
