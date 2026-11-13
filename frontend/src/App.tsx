import React, { useState, useEffect } from 'react';
import {
  ActiveScreen,
  Restaurant,
  Product,
  CartItem,
  DeliveryAddress,
  UserProfile,
  Order,
} from './types';
import { SaborTucApi } from './services/api';

import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';

import { ExploreScreen } from './screens/ExploreScreen';
import { CatalogScreen } from './screens/CatalogScreen';
import { InteractiveMapScreen } from './screens/InteractiveMapScreen';
import { RestaurantDetailScreen } from './screens/RestaurantDetailScreen';
import { CartScreen } from './screens/CartScreen';
import { CheckoutScreen } from './screens/CheckoutScreen';
import { OrdersHistoryScreen } from './screens/OrdersHistoryScreen';
import { OrderTrackingScreen } from './screens/OrderTrackingScreen';
import { AuthScreen } from './screens/AuthScreen';
import { ProfileScreen } from './screens/ProfileScreen';
import { OperationsScreen } from './screens/OperationsScreen';

const paymentReturnOrderId = new URLSearchParams(window.location.search).get('orderId') ?? '';

function CustomerApp() {
  // Restaurantes: vienen siempre de la API .NET (no hay datos locales de respaldo)
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [loadingRestaurants, setLoadingRestaurants] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const loadRestaurants = () => {
    setLoadingRestaurants(true);
    setLoadError(null);
    SaborTucApi.getRestaurants()
      .then(setRestaurants)
      .catch((e) => setLoadError(e?.message || 'No se pudo conectar con el servidor de SaborTUC.'))
      .finally(() => setLoadingRestaurants(false));
  };
  useEffect(loadRestaurants, []);

  const [currentScreen, setCurrentScreen] = useState<ActiveScreen>(paymentReturnOrderId ? 'order-tracking' : 'explore');
  const [selectedRestaurantId, setSelectedRestaurantId] = useState<string>('el-portal-regionales');
  const [activeTrackingOrderId, setActiveTrackingOrderId] = useState<string>(paymentReturnOrderId);
  const [searchQuery, setSearchQuery] = useState<string>('');

  // SMT User State
  const [user, setUser] = useState<UserProfile>({
    id: 'usr-1',
    name: 'Jazmín Berdú',
    email: 'jazmin.berdu20@gmail.com',
    phone: '+54 381 482-9910',
    savedAddresses: [
      {
        id: 'addr-1',
        alias: 'Departamento',
        street: 'Virgen de la Merced',
        number: '420',
        apartment: '4B',
        neighborhood: 'Barrio Norte',
        city: 'San Miguel de Tucumán',
        isDefault: true,
        instructions: 'Tocar timbre 4B.',
      },
      {
        id: 'addr-2',
        alias: 'Oficina Centro',
        street: 'San Martín',
        number: '650',
        apartment: 'Piso 2 Of. C',
        neighborhood: 'Centro',
        city: 'San Miguel de Tucumán',
        isDefault: false,
        instructions: 'Dejar en conserjería.',
      },
      {
        id: 'addr-3',
        alias: 'Casa de mis padres',
        street: 'Chacabuco',
        number: '320',
        neighborhood: 'Barrio Sur',
        city: 'San Miguel de Tucumán',
        isDefault: false,
      },
    ],
  });

  const [currentAddress, setCurrentAddress] = useState<DeliveryAddress>(
    user.savedAddresses.find((a) => a.isDefault) || user.savedAddresses[0]
  );
  const [isLoggedIn, setIsLoggedIn] = useState(true);

  const [cart, setCart] = useState<CartItem[]>([]);

  const [activeOrdersCount, setActiveOrdersCount] = useState<number>(0);

  // Check active orders on mount
  useEffect(() => {
    SaborTucApi.getOrders().then((orders) => {
      const active = orders.filter((o) => o.status !== 'entregado' && o.status !== 'cancelado').length;
      setActiveOrdersCount(active);
    });
  }, [currentScreen]);

  const cartCount = cart.reduce((acc, ci) => acc + ci.quantity, 0);
  const cartTotal = cart.reduce((acc, ci) => acc + ci.product.price * ci.quantity, 0);

  const navigateTo = (screen: ActiveScreen) => {
    setCurrentScreen(screen);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSelectRestaurant = (id: string) => {
    setSelectedRestaurantId(id);
    navigateTo('restaurant-detail');
  };

  const handleAddToCart = (product: Product, quantity: number, notes?: string) => {
    // If cart has items from another restaurant, prompt or replace
    if (cart.length > 0 && cart[0].restaurantId !== product.restaurantId) {
      const confirmReplace = window.confirm(
        `Tu carrito actual tiene productos de "${cart[0].restaurantName}". ¿Deseás vaciar el carrito e iniciar un nuevo pedido en este restaurante?`
      );
      if (!confirmReplace) return;

      const currentStore = restaurants.find((r) => r.id === product.restaurantId);
      setCart([
        {
          product,
          restaurantId: product.restaurantId,
          restaurantName: currentStore?.name || 'Restaurante SMT',
          quantity,
          notes,
          addedAt: new Date().toISOString(),
        },
      ]);
      return;
    }

    setCart((prev) => {
      const existingIdx = prev.findIndex((ci) => ci.product.id === product.id);
      if (existingIdx >= 0) {
        const copy = [...prev];
        copy[existingIdx].quantity += quantity;
        if (notes) copy[existingIdx].notes = notes;
        return copy;
      }
      const currentStore = restaurants.find((r) => r.id === product.restaurantId);
      return [
        ...prev,
        {
          product,
          restaurantId: product.restaurantId,
          restaurantName: currentStore?.name || 'Restaurante SMT',
          quantity,
          notes,
          addedAt: new Date().toISOString(),
        },
      ];
    });
  };

  const handleUpdateCartQuantity = (productId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((ci) => {
          if (ci.product.id === productId) {
            const nextQ = ci.quantity + delta;
            return nextQ > 0 ? { ...ci, quantity: nextQ } : null;
          }
          return ci;
        })
        .filter(Boolean) as CartItem[]
    );
  };

  const handleRemoveFromCart = (productId: string) => {
    setCart((prev) => prev.filter((ci) => ci.product.id !== productId));
  };

  const handleClearCart = () => {
    setCart([]);
  };

  const handleOrderCreated = (order: Order) => {
    setCart([]); // Clear cart after order creation
    setActiveTrackingOrderId(order.id);
    setActiveOrdersCount((prev) => prev + 1);
    navigateTo('order-tracking');
  };

  const handleTrackOrder = (orderId: string) => {
    setActiveTrackingOrderId(orderId);
    navigateTo('order-tracking');
  };

  const currentSelectedRestaurant =
    restaurants.find((r) => r.id === selectedRestaurantId) || restaurants[0];

  return (
    <div className="min-h-screen flex flex-col bg-[#fcf9f6] text-[#1c1917] selection:bg-red-100 selection:text-red-900 font-sans">
      {/* Top Application Header */}
      <Navbar
        currentScreen={currentScreen}
        onNavigate={navigateTo}
        cartCount={cartCount}
        cartTotal={cartTotal}
        activeOrdersCount={activeOrdersCount}
        currentAddress={currentAddress}
        savedAddresses={user.savedAddresses}
        onSelectAddress={(addr) => setCurrentAddress(addr)}
        searchQuery={searchQuery}
        onSearchChange={(q) => {
          setSearchQuery(q);
          if (currentScreen !== 'catalog' && currentScreen !== 'explore' && currentScreen !== 'map') {
            setCurrentScreen('catalog');
          }
        }}
        userName={user.name}
        isLoggedIn={isLoggedIn}
      />

      {/* Primary Workspace View */}
      <div className="flex-1">
        {(loadingRestaurants || loadError) && restaurants.length === 0 && (
          <div className="max-w-xl mx-auto px-4 py-20 text-center">
            {loadingRestaurants ? (
              <p className="text-sm text-stone-500">Cargando restaurantes desde la API de SaborTUC...</p>
            ) : (
              <>
                <h2 className="text-lg font-bold text-stone-900">No se pudo cargar la información</h2>
                <p className="text-sm text-stone-600 mt-2">{loadError}</p>
                <p className="text-xs text-stone-500 mt-1">Verificá que el backend esté corriendo (dotnet run en backend/SaborTuc.Api).</p>
                <button
                  type="button"
                  onClick={loadRestaurants}
                  className="mt-4 px-4 py-2 rounded-lg bg-red-700 text-white text-sm font-bold cursor-pointer"
                >
                  Reintentar
                </button>
              </>
            )}
          </div>
        )}
        {/* 1. Explore Feed Screen */}
        {currentScreen === 'explore' && (
          <ExploreScreen
            restaurants={restaurants}
            onSelectRestaurant={handleSelectRestaurant}
            onNavigateToCatalog={() => navigateTo('catalog')}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
          />
        )}

        {/* 2 & 3. Full Catalog & Search Results Screen (20+ SMT establishments) */}
        {currentScreen === 'catalog' && (
          <CatalogScreen
            restaurants={restaurants}
            onSelectRestaurant={handleSelectRestaurant}
            onNavigateToHome={() => navigateTo('explore')}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
          />
        )}

        {/* 4. Real OpenStreetMap Screen of San Miguel de Tucumán */}
        {currentScreen === 'map' && (
          <InteractiveMapScreen
            restaurants={restaurants}
            onSelectRestaurant={handleSelectRestaurant}
            onNavigateToCatalog={() => navigateTo('catalog')}
            onNavigateToHome={() => navigateTo('explore')}
          />
        )}

        {/* 5 & 6. Restaurant Detail & Menu Screen */}
        {currentScreen === 'restaurant-detail' && currentSelectedRestaurant && (
          <RestaurantDetailScreen
            restaurant={currentSelectedRestaurant}
            onBack={() => navigateTo('catalog')}
            onAddToCart={handleAddToCart}
            cart={cart}
            onOpenCart={() => navigateTo('cart')}
            onNavigateToHome={() => navigateTo('explore')}
          />
        )}

        {/* 7. Cart Screen */}
        {currentScreen === 'cart' && (
          <CartScreen
            cart={cart}
            restaurants={restaurants}
            currentAddress={currentAddress}
            onUpdateQuantity={handleUpdateCartQuantity}
            onRemoveItem={handleRemoveFromCart}
            onClearCart={handleClearCart}
            onProceedToCheckout={() => navigateTo('checkout')}
            onContinueShopping={() => navigateTo('catalog')}
            onNavigateToHome={() => navigateTo('explore')}
          />
        )}

        {/* 8. Checkout & Confirmation Screen */}
        {currentScreen === 'checkout' && (
          <CheckoutScreen
            cart={cart}
            restaurants={restaurants}
            currentAddress={currentAddress}
            savedAddresses={user.savedAddresses}
            onOrderCreated={handleOrderCreated}
            onBackToCart={() => navigateTo('cart')}
            userName={user.name}
            userEmail={user.email}
            userPhone={user.phone}
          />
        )}

        {/* 9. Orders History Screen */}
        {currentScreen === 'orders' && (
          <OrdersHistoryScreen
            onTrackOrder={handleTrackOrder}
            onExplore={() => navigateTo('explore')}
          />
        )}

        {/* 10. Live Order Tracking Screen */}
        {currentScreen === 'order-tracking' && (
          <OrderTrackingScreen
            orderId={activeTrackingOrderId}
            onBackToOrders={() => navigateTo('orders')}
            onExplore={() => navigateTo('explore')}
          />
        )}

        {/* 11. Authentication (Login / Register) Screen */}
        {currentScreen === 'auth' && (
          <AuthScreen
            onLoginSuccess={(loggedUser) => {
              setUser(loggedUser);
              setIsLoggedIn(true);
              navigateTo('profile');
            }}
            onCancel={() => navigateTo('explore')}
          />
        )}

        {/* 12. User Profile & SMT Addresses Screen */}
        {currentScreen === 'profile' && (
          <ProfileScreen
            user={user}
            onUpdateAddresses={(addrs) => {
              setUser((prev) => ({ ...prev, savedAddresses: addrs }));
              const defaultAddr = addrs.find((a) => a.isDefault);
              if (defaultAddr) setCurrentAddress(defaultAddr);
            }}
            onSelectAddress={(addr) => setCurrentAddress(addr)}
            onLogout={() => {
              setIsLoggedIn(false);
              navigateTo('explore');
            }}
            onViewOrders={() => navigateTo('orders')}
            onNavigateToHome={() => navigateTo('explore')}
          />
        )}
      </div>

      {/* Footer */}
      <Footer
        onNavigate={navigateTo}
        restaurantsCount={restaurants.length}
      />
    </div>
  );
}

export default function App() {
  const path = window.location.pathname.replace(/\/$/, '');
  if (path === '/operaciones/restaurante') return <OperationsScreen role="restaurant" />;
  if (path === '/operaciones/cadete') return <OperationsScreen role="courier" />;
  return <CustomerApp />;
}
