import React, { useState } from 'react';
import { UserProfile, DeliveryAddress, SmtNeighborhood } from '../types';
import {
  User,
  MapPin,
  Plus,
  Trash2,
  Check,
  CheckCircle2,
  Phone,
  Mail,
  Building,
  LogOut,
  ArrowLeft,
} from 'lucide-react';

interface ProfileScreenProps {
  user: UserProfile;
  onUpdateAddresses: (addresses: DeliveryAddress[]) => void;
  onSelectAddress: (address: DeliveryAddress) => void;
  onLogout: () => void;
  onViewOrders: () => void;
  onNavigateToHome?: () => void;
}

export const ProfileScreen: React.FC<ProfileScreenProps> = ({
  user,
  onUpdateAddresses,
  onSelectAddress,
  onLogout,
  onViewOrders,
  onNavigateToHome,
}) => {
  const [showAddForm, setShowAddForm] = useState(false);
  const [alias, setAlias] = useState('');
  const [street, setStreet] = useState('');
  const [number, setNumber] = useState('');
  const [apartment, setApartment] = useState('');
  const [neighborhood, setNeighborhood] = useState<SmtNeighborhood>('Barrio Norte');
  const [instructions, setInstructions] = useState('');

  const handleAddAddress = (e: React.FormEvent) => {
    e.preventDefault();
    if (!street.trim() || !number.trim()) return;

    const newAddr: DeliveryAddress = {
      id: `addr-${Date.now()}`,
      alias: alias.trim() || 'Dirección SMT',
      street: street.trim(),
      number: number.trim(),
      apartment: apartment.trim() || undefined,
      neighborhood,
      instructions: instructions.trim() || undefined,
      city: 'San Miguel de Tucumán',
      isDefault: user.savedAddresses.length === 0,
    };

    const updated = [...user.savedAddresses, newAddr];
    onUpdateAddresses(updated);

    // Reset
    setAlias('');
    setStreet('');
    setNumber('');
    setApartment('');
    setInstructions('');
    setShowAddForm(false);
  };

  const handleDeleteAddress = (id: string) => {
    const updated = user.savedAddresses.filter((a) => a.id !== id);
    onUpdateAddresses(updated);
  };

  const handleSetDefault = (id: string) => {
    const updated = user.savedAddresses.map((a) => ({
      ...a,
      isDefault: a.id === id,
    }));
    onUpdateAddresses(updated);
    const target = updated.find((a) => a.id === id);
    if (target) onSelectAddress(target);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Return to Home button */}
      {onNavigateToHome && (
        <button
          onClick={onNavigateToHome}
          className="mb-4 inline-flex items-center gap-1.5 text-xs font-bold text-stone-700 hover:text-stone-900 transition-colors cursor-pointer bg-white px-3 py-1.5 rounded-lg border border-stone-200 shadow-xs"
        >
          <ArrowLeft className="w-3.5 h-3.5 text-stone-500" />
          <span>Volver al inicio</span>
        </button>
      )}

      <div className="flex items-center justify-between border-b border-stone-200 pb-5 mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-stone-900 tracking-tight">
            Mi Cuenta y Direcciones
          </h1>
          <p className="text-xs sm:text-sm text-stone-500 mt-0.5">
            Configuración del usuario y domicilios registrados en San Miguel de Tucumán
          </p>
        </div>

        <button
          onClick={onLogout}
          className="text-xs font-semibold text-stone-500 hover:text-red-700 flex items-center gap-1.5 cursor-pointer"
        >
          <LogOut className="w-4 h-4" />
          <span>Cerrar sesión</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
        {/* User Info card */}
        <div className="md:col-span-5 bg-white rounded-2xl border border-stone-200 p-6 shadow-xs">
          <div className="w-14 h-14 rounded-2xl bg-stone-900 text-white flex items-center justify-center font-bold text-xl mb-4">
            {user.name.charAt(0)}
          </div>
          <h2 className="font-extrabold text-stone-900 text-lg">{user.name}</h2>
          <div className="space-y-2 mt-4 pt-4 border-t border-stone-100 text-xs text-stone-600">
            <div className="flex items-center gap-2">
              <Mail className="w-4 h-4 text-stone-400" />
              <span>{user.email}</span>
            </div>
            <div className="flex items-center gap-2">
              <Phone className="w-4 h-4 text-stone-400" />
              <span>{user.phone}</span>
            </div>
            <div className="flex items-center gap-2">
              <Building className="w-4 h-4 text-stone-400" />
              <span>San Miguel de Tucumán, Argentina</span>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-stone-100">
            <button
              onClick={onViewOrders}
              className="w-full py-2.5 px-3 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-900 text-xs font-bold transition-colors cursor-pointer text-center"
            >
              Consultar mis pedidos en SaborTUC
            </button>
          </div>
        </div>

        {/* Addresses management */}
        <div className="md:col-span-7 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-stone-900 text-base flex items-center gap-2">
              <MapPin className="w-4 h-4 text-red-700" />
              <span>Direcciones en San Miguel de Tucumán</span>
            </h3>

            {!showAddForm && (
              <button
                onClick={() => setShowAddForm(true)}
                className="py-1.5 px-3 rounded-lg bg-stone-900 hover:bg-stone-800 text-white text-xs font-bold flex items-center gap-1 cursor-pointer shadow-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Nueva dirección</span>
              </button>
            )}
          </div>

          {/* New address form */}
          {showAddForm && (
            <form
              onSubmit={handleAddAddress}
              className="bg-white p-5 rounded-2xl border border-stone-300 shadow-sm space-y-3 text-xs"
            >
              <div className="flex items-center justify-between pb-2 border-b border-stone-100">
                <span className="font-bold text-stone-900 text-sm">Registrar dirección en SMT</span>
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="text-stone-400 hover:text-stone-700 font-bold"
                >
                  ✕ Cancelar
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-stone-700 mb-1">Nombre / Alias (ej: Casa, Trabajo)</label>
                  <input
                    type="text"
                    required
                    value={alias}
                    onChange={(e) => setAlias(e.target.value)}
                    placeholder="Casa"
                    className="w-full p-2 rounded-lg border border-stone-200 focus:outline-none focus:border-stone-400"
                  />
                </div>
                <div>
                  <label className="block font-bold text-stone-700 mb-1">Zona en SMT</label>
                  <select
                    value={neighborhood}
                    onChange={(e) => setNeighborhood(e.target.value as any)}
                    className="w-full p-2 rounded-lg border border-stone-200 bg-stone-50 focus:outline-none"
                  >
                    <option value="Barrio Norte">Barrio Norte</option>
                    <option value="Centro">Centro</option>
                    <option value="Barrio Sur">Barrio Sur</option>
                    <option value="Plaza Independencia">Plaza Independencia</option>
                    <option value="Centro Histórico">Centro Histórico</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block font-bold text-stone-700 mb-1">Calle *</label>
                  <input
                    type="text"
                    required
                    value={street}
                    onChange={(e) => setStreet(e.target.value)}
                    placeholder="25 de Mayo, Laprida, etc."
                    className="w-full p-2 rounded-lg border border-stone-200 focus:outline-none focus:border-stone-400"
                  />
                </div>
                <div>
                  <label className="block font-bold text-stone-700 mb-1">Número *</label>
                  <input
                    type="text"
                    required
                    value={number}
                    onChange={(e) => setNumber(e.target.value)}
                    placeholder="450"
                    className="w-full p-2 rounded-lg border border-stone-200 focus:outline-none focus:border-stone-400"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-stone-700 mb-1">Piso / Depto (opcional)</label>
                <input
                  type="text"
                  value={apartment}
                  onChange={(e) => setApartment(e.target.value)}
                  placeholder="3B"
                  className="w-full p-2 rounded-lg border border-stone-200 focus:outline-none focus:border-stone-400"
                />
              </div>

              <div>
                <label className="block font-bold text-stone-700 mb-1">Instrucciones de entrega</label>
                <input
                  type="text"
                  value={instructions}
                  onChange={(e) => setInstructions(e.target.value)}
                  placeholder="Dejar en conserjería..."
                  className="w-full p-2 rounded-lg border border-stone-200 focus:outline-none focus:border-stone-400"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="submit"
                  className="py-2 px-4 rounded-lg bg-stone-900 text-white font-bold hover:bg-stone-800 transition-colors cursor-pointer"
                >
                  Guardar dirección
                </button>
              </div>
            </form>
          )}

          {/* Addresses list */}
          <div className="space-y-3">
            {user.savedAddresses.map((addr) => (
              <div
                key={addr.id}
                className="bg-white p-4 rounded-xl border border-stone-200 flex items-start justify-between gap-3 shadow-xs"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-stone-900 text-sm">{addr.alias}</span>
                    {addr.isDefault && (
                      <span className="bg-emerald-50 text-emerald-800 border border-emerald-200 px-1.5 py-0.2 rounded text-[10px] font-bold">
                        Predeterminada
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-stone-600 mt-1">
                    {addr.street} {addr.number}
                    {addr.apartment ? ` (Depto ${addr.apartment})` : ''} · {addr.neighborhood}
                  </div>
                  <div className="text-[11px] text-stone-400 mt-0.5">
                    San Miguel de Tucumán
                  </div>
                  {addr.instructions && (
                    <div className="text-[11px] text-stone-500 mt-1 italic">
                      "{addr.instructions}"
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  {!addr.isDefault && (
                    <button
                      onClick={() => handleSetDefault(addr.id)}
                      className="text-xs font-semibold text-stone-600 hover:text-stone-900 px-2 py-1 rounded bg-stone-50 border border-stone-200 cursor-pointer"
                    >
                      Usar como actual
                    </button>
                  )}
                  {user.savedAddresses.length > 1 && (
                    <button
                      onClick={() => handleDeleteAddress(addr.id)}
                      className="p-1.5 text-stone-400 hover:text-red-700 cursor-pointer"
                      title="Eliminar dirección"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
