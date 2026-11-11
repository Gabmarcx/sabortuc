import React, { useState } from 'react';
import { Restaurant, Product, CartItem } from '../types';
import { ProductModal } from '../components/ProductModal';
import {
  Star,
  Clock,
  Phone,
  Plus,
  ArrowLeft,
  Home,
  ShoppingBag,
} from 'lucide-react';

interface RestaurantDetailScreenProps {
  restaurant: Restaurant;
  onBack: () => void;
  onAddToCart: (product: Product, quantity: number, notes?: string) => void;
  cart: CartItem[];
  onOpenCart: () => void;
  onNavigateToHome?: () => void;
}

export const RestaurantDetailScreen: React.FC<RestaurantDetailScreenProps> = ({
  restaurant,
  onBack,
  onAddToCart,
  cart,
  onOpenCart,
  onNavigateToHome,
}) => {
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('Todas');

  // Extract unique categories from products
  const productCategories = ['Todas', ...Array.from(new Set(restaurant.products.map((p) => p.category)))];

  const filteredProducts =
    selectedCategory === 'Todas'
      ? restaurant.products
      : restaurant.products.filter((p) => p.category === selectedCategory);

  const cartFromThisStore = cart.filter((item) => item.restaurantId === restaurant.id);
  const storeSubtotal = cartFromThisStore.reduce((acc, ci) => acc + ci.product.price * ci.quantity, 0);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* Back navigation */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {onNavigateToHome && (
            <>
              <button
                onClick={onNavigateToHome}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-stone-800 hover:text-red-700 bg-white hover:bg-stone-50 px-3 py-1.5 rounded-lg border border-stone-200 shadow-xs transition-colors cursor-pointer"
                title="Volver a la pantalla principal"
              >
                <Home className="w-3.5 h-3.5 text-stone-500" />
                <span>Volver al inicio</span>
              </button>
              <span className="text-stone-300">/</span>
            </>
          )}
          <button
            onClick={onBack}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-stone-600 hover:text-stone-900 bg-white hover:bg-stone-50 px-3 py-1.5 rounded-lg border border-stone-200 shadow-xs transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Volver al catálogo</span>
          </button>
        </div>

        <span className="text-[11px] text-stone-500 hidden sm:inline">
          {restaurant.neighborhood} · San Miguel de Tucumán
        </span>
      </div>

      {/* Restaurant Header Banner */}
      <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden shadow-sm mb-8">
        <div className="relative h-48 sm:h-64 w-full bg-stone-900">
          <img
            src={restaurant.coverImage || restaurant.image}
            alt={restaurant.name}
            className="w-full h-full object-cover opacity-85"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-stone-950/80 via-stone-950/20 to-transparent" />

          {/* Top floating badges */}
          <div className="absolute top-4 left-4 flex items-center gap-2">
            <span className="bg-stone-900/80 backdrop-blur-xs text-white text-xs font-semibold px-2.5 py-1 rounded">
              {restaurant.category} · {restaurant.neighborhood}
            </span>
            {restaurant.isOpen ? (
              <span className="bg-emerald-600 text-white text-xs font-bold px-2 py-0.5 rounded shadow-xs flex items-center gap-1">
                ● Abierto
              </span>
            ) : (
              <span className="bg-stone-800 text-stone-300 text-xs font-semibold px-2 py-0.5 rounded shadow-xs">
                Cerrado
              </span>
            )}
          </div>

          {/* Title on cover */}
          <div className="absolute bottom-4 left-4 right-4 text-white">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              {restaurant.name}
            </h1>
            <p className="text-stone-300 text-xs sm:text-sm mt-1 max-w-2xl truncate">
              📍 {restaurant.address}, San Miguel de Tucumán
            </p>
          </div>
        </div>

        {/* Detailed Info Strip */}
        <div className="p-4 sm:p-5 flex flex-wrap items-center justify-between gap-4 bg-stone-50 border-t border-stone-100 text-xs text-stone-600">
          <div className="flex flex-wrap items-center gap-4 sm:gap-6 font-medium">
            <div className="flex items-center gap-1.5 bg-white px-2.5 py-1 rounded-md border border-stone-200">
              <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
              <span className="font-bold text-stone-900 text-sm">{restaurant.rating}</span>
              <span className="text-stone-500 text-[11px]">({restaurant.reviewsCount} opiniones)</span>
            </div>

            <div className="flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-stone-400" />
              <span>{restaurant.estimatedDeliveryTime}</span>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="text-stone-400">Envío:</span>
              <span className="font-bold text-stone-900">${restaurant.deliveryFee.toLocaleString('es-AR')}</span>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="text-stone-400">Pedido mín:</span>
              <span className="font-bold text-stone-900">${restaurant.minOrder.toLocaleString('es-AR')}</span>
            </div>

            <div className="flex items-center gap-1.5">
              <Phone className="w-3.5 h-3.5 text-stone-400" />
              <span>{restaurant.phone}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Menu Header and Category Tabs */}
      <div className="mb-6">
        <h2 className="text-lg font-bold text-stone-900 mb-3">Carta y Productos</h2>
        <div className="flex items-center gap-1.5 overflow-x-auto pb-2 scrollbar-none border-b border-stone-200">
          {productCategories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors cursor-pointer ${
                selectedCategory === cat
                  ? 'bg-stone-900 text-white font-bold'
                  : 'bg-white text-stone-600 border border-stone-200 hover:border-stone-400'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Products Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-16">
        {filteredProducts.map((prod) => (
          <div
            key={prod.id}
            onClick={() => setSelectedProduct(prod)}
            className="group bg-white p-4 rounded-xl border border-stone-200 hover:border-stone-400 hover:shadow-xs transition-all flex justify-between gap-4 cursor-pointer"
          >
            <div className="flex-1 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[10px] font-bold text-stone-500 uppercase tracking-wider">
                    {prod.category}
                  </span>
                  {prod.isPopular && (
                    <span className="text-[10px] font-bold text-red-700 bg-red-50 px-1.5 py-0.2 rounded">
                      Más pedido
                    </span>
                  )}
                </div>
                <h3 className="font-bold text-stone-900 text-sm group-hover:text-red-700 transition-colors">
                  {prod.name}
                </h3>
                <p className="text-xs text-stone-500 mt-1 line-clamp-2 leading-relaxed">
                  {prod.description}
                </p>
              </div>

              <div className="mt-3 flex items-center justify-between">
                <span className="font-black text-stone-900 text-base">
                  ${prod.price.toLocaleString('es-AR')}
                </span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedProduct(prod);
                  }}
                  className="py-1 px-2.5 rounded-lg bg-stone-900 hover:bg-stone-800 text-white text-xs font-bold transition-colors flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Agregar</span>
                </button>
              </div>
            </div>

            <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-lg overflow-hidden shrink-0 bg-stone-100 border border-stone-100">
              <img
                src={prod.image}
                alt={prod.name}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                loading="lazy"
              />
            </div>
          </div>
        ))}
      </div>

      {/* Sticky Bottom Cart Bar if items exist from this store */}
      {cartFromThisStore.length > 0 && (
        <div className="fixed bottom-4 left-4 right-4 max-w-3xl mx-auto z-40 bg-stone-900 text-white rounded-2xl p-4 shadow-xl border border-stone-800 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-700 text-white flex items-center justify-center font-black text-sm">
              <ShoppingBag className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-bold text-stone-200">
                {cartFromThisStore.reduce((a, b) => a + b.quantity, 0)} productos en tu pedido de {restaurant.name}
              </div>
              <div className="text-base font-black text-white">
                Subtotal: ${storeSubtotal.toLocaleString('es-AR')}
              </div>
            </div>
          </div>

          <button
            onClick={onOpenCart}
            className="py-2.5 px-5 rounded-xl bg-white text-stone-900 text-xs font-extrabold hover:bg-stone-100 transition-colors cursor-pointer"
          >
            Ver Carrito y Pagar →
          </button>
        </div>
      )}

      {/* Modal for product selection */}
      {selectedProduct && (
        <ProductModal
          product={selectedProduct}
          restaurant={restaurant}
          onClose={() => setSelectedProduct(null)}
          onAddToCart={onAddToCart}
        />
      )}
    </div>
  );
};
