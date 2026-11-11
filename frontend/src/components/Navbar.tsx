import React, { useState } from 'react';
import {
  Home,
  Search,
  MapPin,
  ShoppingBag,
  Clock,
  Compass,
  User,
  ChevronDown,
  ListFilter,
  Map as MapIcon,
} from 'lucide-react';
import { ActiveScreen, DeliveryAddress } from '../types';

interface NavbarProps {
  currentScreen: ActiveScreen;
  onNavigate: (screen: ActiveScreen) => void;
  cartCount: number;
  cartTotal: number;
  activeOrdersCount: number;
  currentAddress: DeliveryAddress;
  savedAddresses: DeliveryAddress[];
  onSelectAddress: (addr: DeliveryAddress) => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  userName: string;
  isLoggedIn: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentScreen,
  onNavigate,
  cartCount,
  cartTotal,
  activeOrdersCount,
  currentAddress,
  savedAddresses,
  onSelectAddress,
  searchQuery,
  onSearchChange,
  userName,
  isLoggedIn,
}) => {
  const [showAddressDropdown, setShowAddressDropdown] = useState(false);

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-stone-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-3 sm:gap-6">
          {/* Brand Logo */}
          <div className="flex items-center gap-6 shrink-0">
            <button
              onClick={() => onNavigate('explore')}
              className="flex items-center gap-2.5 text-left group cursor-pointer"
            >
              <div className="w-8 h-8 rounded-lg bg-stone-900 text-white flex items-center justify-center font-black text-sm tracking-tighter">
                ST
              </div>
              <div>
                <div className="text-base font-bold text-stone-900 leading-tight flex items-center gap-1.5">
                  <span>Sabor<span className="text-red-700">TUC</span></span>
                  <span className="text-[10px] font-semibold bg-stone-100 text-stone-600 px-1.5 py-0.5 rounded border border-stone-200">
                    SMT
                  </span>
                </div>
                <div className="text-[10px] text-stone-500 font-medium">
                  San Miguel de Tucumán
                </div>
              </div>
            </button>

            {/* Delivery Address Selector */}
            <div className="relative hidden md:block">
              <button
                onClick={() => setShowAddressDropdown(!showAddressDropdown)}
                className="flex items-center gap-2 py-1.5 px-3 rounded-lg text-xs font-medium text-stone-700 bg-stone-50 border border-stone-200 hover:bg-stone-100 transition-colors cursor-pointer max-w-[240px] truncate"
              >
                <MapPin className="w-3.5 h-3.5 text-red-700 shrink-0" />
                <span className="truncate">
                  {currentAddress.street} {currentAddress.number}, {currentAddress.neighborhood}
                </span>
                <ChevronDown className="w-3 h-3 text-stone-400 shrink-0" />
              </button>

              {showAddressDropdown && (
                <>
                  <div
                    className="fixed inset-0 z-20"
                    onClick={() => setShowAddressDropdown(false)}
                  />
                  <div className="absolute left-0 top-full mt-1.5 w-72 bg-white rounded-xl shadow-lg border border-stone-200 p-2 z-30">
                    <div className="text-[11px] font-bold text-stone-500 px-2 py-1 uppercase tracking-wider">
                      Dirección en San Miguel de Tucumán
                    </div>
                    {savedAddresses.map((addr) => (
                      <button
                        key={addr.id}
                        onClick={() => {
                          onSelectAddress(addr);
                          setShowAddressDropdown(false);
                        }}
                        className={`w-full text-left p-2 rounded-lg text-xs flex items-center justify-between hover:bg-stone-50 transition-colors cursor-pointer ${
                          addr.id === currentAddress.id
                            ? 'bg-stone-50 font-bold text-stone-900'
                            : 'text-stone-700'
                        }`}
                      >
                        <div className="truncate pr-2">
                          <div className="font-semibold text-stone-900">{addr.alias}</div>
                          <div className="text-[11px] text-stone-500 truncate">
                            {addr.street} {addr.number} ({addr.neighborhood})
                          </div>
                        </div>
                        {addr.id === currentAddress.id && (
                          <span className="text-[10px] font-bold text-red-700 bg-red-50 px-1.5 py-0.5 rounded">
                            Actual
                          </span>
                        )}
                      </button>
                    ))}
                    <div className="pt-2 mt-1 border-t border-stone-100">
                      <button
                        onClick={() => {
                          setShowAddressDropdown(false);
                          onNavigate('profile');
                        }}
                        className="w-full text-center text-xs font-medium text-red-700 hover:underline p-1 cursor-pointer"
                      >
                        Gestionar mis direcciones en SMT
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Search bar */}
          <div className="flex-1 max-w-md mx-2">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none" />
              <input
                type="text"
                placeholder="Buscar empanadas, pizzerías, cafés o platos en SMT..."
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                onFocus={() => {
                  if (currentScreen !== 'catalog' && currentScreen !== 'explore' && currentScreen !== 'map') {
                    onNavigate('catalog');
                  }
                }}
                className="w-full pl-9 pr-3 py-1.5 rounded-lg border border-stone-200 bg-stone-50 text-xs text-stone-900 placeholder:text-stone-400 focus:outline-none focus:bg-white focus:border-stone-400 transition-colors"
              />
            </div>
          </div>

          {/* Navigation Links and Actions */}
          <div className="flex items-center gap-1 sm:gap-2 shrink-0">
            {/* Inicio Button */}
            <button
              onClick={() => onNavigate('explore')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                currentScreen === 'explore'
                  ? 'bg-stone-900 text-white shadow-xs'
                  : 'bg-stone-100 hover:bg-stone-200 text-stone-900 border border-stone-200 hover:border-stone-300'
              }`}
              title="Volver a la pantalla de Inicio"
            >
              <Home className="w-4 h-4 text-red-600" />
              <span>Inicio</span>
            </button>

            {/* View Switchers */}
            <button
              onClick={() => onNavigate('catalog')}
              className={`p-2 sm:px-3 sm:py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer ${
                currentScreen === 'catalog'
                  ? 'bg-stone-900 text-white font-bold'
                  : 'text-stone-600 hover:text-stone-900 hover:bg-stone-50'
              }`}
              title="Catálogo de restaurantes"
            >
              <ListFilter className="w-4 h-4" />
              <span className="hidden lg:inline">Catálogo (20)</span>
            </button>

            <button
              onClick={() => onNavigate('map')}
              className={`p-2 sm:px-3 sm:py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer ${
                currentScreen === 'map'
                  ? 'bg-stone-100 text-stone-900 font-bold'
                  : 'text-stone-600 hover:text-stone-900 hover:bg-stone-50'
              }`}
              title="Mapa OpenStreetMap SMT"
            >
              <MapIcon className="w-4 h-4" />
              <span className="hidden lg:inline">Mapa</span>
            </button>

            {/* Orders link */}
            <button
              onClick={() => onNavigate('orders')}
              className={`relative p-2 sm:px-3 sm:py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer ${
                currentScreen === 'orders' || currentScreen === 'order-tracking'
                  ? 'bg-stone-100 text-stone-900 font-bold'
                  : 'text-stone-600 hover:text-stone-900 hover:bg-stone-50'
              }`}
              title="Mis pedidos"
            >
              <Clock className="w-4 h-4" />
              <span className="hidden sm:inline">Pedidos</span>
              {activeOrdersCount > 0 && (
                <span className="w-2 h-2 rounded-full bg-red-600 animate-pulse"></span>
              )}
            </button>

            {/* Cart Button */}
            <button
              onClick={() => onNavigate('cart')}
              className="relative p-2 sm:px-3.5 sm:py-1.5 rounded-lg bg-stone-900 hover:bg-stone-800 text-white text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer shadow-xs"
            >
              <ShoppingBag className="w-4 h-4" />
              <span className="hidden sm:inline">
                {cartCount > 0 ? `$${cartTotal.toLocaleString('es-AR')}` : 'Carrito'}
              </span>
              {cartCount > 0 && (
                <span className="w-5 h-5 rounded-full bg-red-600 text-white text-[11px] font-black flex items-center justify-center">
                  {cartCount}
                </span>
              )}
            </button>

            {/* Profile / Auth */}
            <button
              onClick={() => onNavigate(isLoggedIn ? 'profile' : 'auth')}
              className="p-2 rounded-lg text-stone-600 hover:text-stone-900 hover:bg-stone-50 transition-colors cursor-pointer"
              title={isLoggedIn ? `Perfil de ${userName}` : 'Iniciar sesión'}
            >
              <User className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
