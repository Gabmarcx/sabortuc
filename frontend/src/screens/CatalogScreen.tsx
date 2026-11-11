import React, { useState } from 'react';
import {
  Restaurant,
  RestaurantCategory,
  SmtNeighborhood,
  FilterParams,
} from '../types';
import { RestaurantCard } from '../components/RestaurantCard';
import {
  Search,
  Filter,
  CheckCircle2,
  Clock,
  ArrowUpDown,
  Building2,
  X,
  SlidersHorizontal,
  ArrowLeft,
  Home,
} from 'lucide-react';

interface CatalogScreenProps {
  restaurants: Restaurant[];
  onSelectRestaurant: (restaurantId: string) => void;
  onNavigateToHome?: () => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
}

const CATEGORIES: RestaurantCategory[] = [
  'Todas',
  'Pizzería',
  'Regional',
  'Cafetería & Pastelería',
  'Hamburguesería',
  'Bodegón & Cocina',
  'Bar & Cervecería',
  'Parrilla & Asador',
  'Sándwiches & Minutas',
];

export const CatalogScreen: React.FC<CatalogScreenProps> = ({
  restaurants,
  onSelectRestaurant,
  onNavigateToHome,
  searchQuery,
  onSearchChange,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<RestaurantCategory>('Todas');
  const [selectedNeighborhood, setSelectedNeighborhood] = useState<string>('Todos');
  const [priceFilters, setPriceFilters] = useState<('$' | '$$' | '$$$')[]>([]);
  const [onlyOpen, setOnlyOpen] = useState(false);
  const [maxDeliveryFee, setMaxDeliveryFee] = useState<number>(3000);
  const [sortBy, setSortBy] = useState<'rating' | 'deliveryFee' | 'deliveryTime' | 'recommended'>('recommended');
  const [showFiltersMobile, setShowFiltersMobile] = useState(false);

  const togglePrice = (p: '$' | '$$' | '$$$') => {
    setPriceFilters((prev) =>
      prev.includes(p) ? prev.filter((item) => item !== p) : [...prev, p]
    );
  };

  // Filter application
  let list = restaurants.filter((r) => {
    const matchesCategory = selectedCategory === 'Todas' || r.category === selectedCategory;
    const matchesNeighborhood = selectedNeighborhood === 'Todos' || r.neighborhood === selectedNeighborhood;
    const matchesPrice = priceFilters.length === 0 || priceFilters.includes(r.priceRange);
    const matchesOpen = !onlyOpen || r.isOpen;
    const matchesFee = r.deliveryFee <= maxDeliveryFee;
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !q ||
      r.name.toLowerCase().includes(q) ||
      r.category.toLowerCase().includes(q) ||
      r.address.toLowerCase().includes(q) ||
      r.products.some((p) => p.name.toLowerCase().includes(q));

    return (
      matchesCategory &&
      matchesNeighborhood &&
      matchesPrice &&
      matchesOpen &&
      matchesFee &&
      matchesSearch
    );
  });

  // Sorting
  if (sortBy === 'rating') {
    list.sort((a, b) => b.rating - a.rating);
  } else if (sortBy === 'deliveryFee') {
    list.sort((a, b) => a.deliveryFee - b.deliveryFee);
  } else if (sortBy === 'deliveryTime') {
    list.sort((a, b) => parseInt(a.estimatedDeliveryTime) - parseInt(b.estimatedDeliveryTime));
  } else {
    list.sort((a, b) => b.reviewsCount - a.reviewsCount);
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* Return to Home button */}
      <div className="mb-4 flex items-center justify-between">
        <button
          onClick={onNavigateToHome}
          className="inline-flex items-center gap-2 text-xs font-bold text-stone-800 hover:text-red-700 bg-white hover:bg-stone-50 px-3.5 py-2 rounded-xl border border-stone-200 shadow-xs transition-all cursor-pointer group"
          title="Volver a la pantalla principal"
        >
          <Home className="w-4 h-4 text-stone-500 group-hover:text-red-700 transition-colors" />
          <span className="text-stone-300">|</span>
          <ArrowLeft className="w-3.5 h-3.5 text-stone-400 group-hover:text-red-700 transition-colors" />
          <span>Volver al inicio</span>
        </button>

        {onNavigateToHome && (
          <span className="text-[11px] text-stone-500 hidden sm:inline">
            Navegación / <strong className="text-stone-800">Catálogo Completo</strong>
          </span>
        )}
      </div>

      {/* Header */}
      <div className="mb-6 flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-stone-200 pb-5">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-stone-500 uppercase tracking-wider mb-1">
            <Building2 className="w-4 h-4 text-red-700" />
            <span>DIRECTORIO GASTRONÓMICO OFICIAL</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-stone-900 tracking-tight">
            Catálogo de Establecimientos ({restaurants.length} en San Miguel de Tucumán)
          </h1>
          <p className="text-xs sm:text-sm text-stone-500 mt-1">
            Todos los locales cuentan con dirección en SMT y carta disponible para pedidos online.
          </p>
        </div>

        {/* Sort & Mobile filter trigger */}
        <div className="flex items-center gap-3">
          {onNavigateToHome && (
            <button
              onClick={onNavigateToHome}
              className="py-1.5 px-3 rounded-lg border border-stone-200 bg-white hover:bg-stone-50 text-xs font-bold text-stone-700 transition-colors cursor-pointer flex items-center gap-1.5"
              title="Volver al inicio"
            >
              <Home className="w-3.5 h-3.5 text-red-600" />
              <span>Inicio</span>
            </button>
          )}

          <button
            onClick={() => setShowFiltersMobile(!showFiltersMobile)}
            className="md:hidden py-2 px-3 rounded-lg border border-stone-200 bg-white text-xs font-semibold flex items-center gap-1.5"
          >
            <Filter className="w-3.5 h-3.5" />
            <span>Filtros</span>
          </button>

          <div className="flex items-center gap-2 text-xs">
            <ArrowUpDown className="w-3.5 h-3.5 text-stone-400" />
            <span className="text-stone-500 font-medium">Ordenar:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="py-1.5 px-3 rounded-lg border border-stone-200 bg-white text-xs font-semibold text-stone-800 focus:outline-none"
            >
              <option value="recommended">Más populares</option>
              <option value="rating">Mejor valoración (★)</option>
              <option value="deliveryFee">Menor costo de envío</option>
              <option value="deliveryTime">Menor tiempo de entrega</option>
            </select>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
        {/* Left Filter Sidebar */}
        <aside
          className={`md:col-span-3 bg-white p-5 rounded-xl border border-stone-200 flex flex-col gap-5 ${
            showFiltersMobile ? 'block mb-6' : 'hidden md:flex'
          }`}
        >
          <div className="flex items-center justify-between pb-3 border-b border-stone-100">
            <h3 className="font-bold text-stone-900 text-sm flex items-center gap-1.5">
              <SlidersHorizontal className="w-4 h-4 text-stone-500" />
              <span>Filtros de Búsqueda</span>
            </h3>
            <button
              onClick={() => {
                setSelectedCategory('Todas');
                setSelectedNeighborhood('Todos');
                setPriceFilters([]);
                setOnlyOpen(false);
                setMaxDeliveryFee(3000);
                onSearchChange('');
              }}
              className="text-[11px] font-semibold text-red-700 hover:underline cursor-pointer"
            >
              Limpiar
            </button>
          </div>

          {/* Categoría */}
          <div>
            <label className="block text-xs font-bold text-stone-800 mb-2">
              Categoría Gastronómica
            </label>
            <div className="space-y-1 text-xs">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`w-full text-left px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer flex items-center justify-between ${
                    selectedCategory === cat
                      ? 'bg-stone-900 text-white font-bold'
                      : 'text-stone-600 hover:bg-stone-50'
                  }`}
                >
                  <span>{cat}</span>
                  {selectedCategory === cat && <span className="text-[10px]">●</span>}
                </button>
              ))}
            </div>
          </div>

          {/* Barrio en SMT */}
          <div className="pt-4 border-t border-stone-100">
            <label className="block text-xs font-bold text-stone-800 mb-2">
              Zona en San Miguel de Tucumán
            </label>
            <select
              value={selectedNeighborhood}
              onChange={(e) => setSelectedNeighborhood(e.target.value)}
              className="w-full py-1.5 px-2.5 rounded-lg border border-stone-200 text-xs bg-stone-50 text-stone-800 focus:outline-none"
            >
              <option value="Todos">Todas las zonas (SMT)</option>
              <option value="Barrio Norte">Barrio Norte</option>
              <option value="Centro">Centro</option>
              <option value="Barrio Sur">Barrio Sur</option>
              <option value="Plaza Independencia">Plaza Independencia</option>
              <option value="Centro Histórico">Centro Histórico</option>
            </select>
          </div>

          {/* Nivel de Precio */}
          <div className="pt-4 border-t border-stone-100">
            <label className="block text-xs font-bold text-stone-800 mb-2">
              Rango de Precio
            </label>
            <div className="flex gap-2">
              {(['$', '$$', '$$$'] as const).map((p) => (
                <button
                  key={p}
                  onClick={() => togglePrice(p)}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-bold border transition-colors cursor-pointer ${
                    priceFilters.includes(p)
                      ? 'bg-stone-900 text-white border-stone-900'
                      : 'bg-stone-50 text-stone-600 border-stone-200 hover:border-stone-300'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          {/* Disponibilidad */}
          <div className="pt-4 border-t border-stone-100 space-y-2">
            <label className="block text-xs font-bold text-stone-800 mb-1">
              Disponibilidad
            </label>
            <label className="flex items-center gap-2 text-xs text-stone-700 cursor-pointer">
              <input
                type="checkbox"
                checked={onlyOpen}
                onChange={(e) => setOnlyOpen(e.target.checked)}
                className="rounded text-red-700 focus:ring-red-700 w-3.5 h-3.5"
              />
              <span>Solo abiertos para entrega ahora</span>
            </label>
          </div>

          {/* Costo de Envío */}
          <div className="pt-4 border-t border-stone-100">
            <div className="flex justify-between text-xs font-bold text-stone-800 mb-1">
              <span>Costo máx. de envío:</span>
              <span className="text-red-700">${maxDeliveryFee.toLocaleString('es-AR')}</span>
            </div>
            <input
              type="range"
              min={1000}
              max={2500}
              step={100}
              value={maxDeliveryFee}
              onChange={(e) => setMaxDeliveryFee(Number(e.target.value))}
              className="w-full accent-red-700"
            />
          </div>
        </aside>

        {/* Main Grid Column */}
        <main className="md:col-span-9 flex flex-col gap-4">
          <div className="flex items-center justify-between text-xs text-stone-500 pb-1">
            <span>
              Mostrando <strong className="text-stone-900 font-bold">{list.length}</strong> de{' '}
              <strong className="text-stone-900 font-bold">{restaurants.length}</strong> establecimientos en SMT
            </span>
            {searchQuery && (
              <span className="bg-stone-100 px-2 py-0.5 rounded text-stone-700">
                Filtro activo: "{searchQuery}"
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {list.map((r) => (
              <RestaurantCard
                key={r.id}
                restaurant={r}
                onSelect={onSelectRestaurant}
              />
            ))}
          </div>

          {list.length === 0 && (
            <div className="py-20 text-center bg-white rounded-xl border border-stone-200 p-8">
              <p className="text-stone-500 text-sm">
                No hay establecimientos que coincidan con los criterios seleccionados.
              </p>
              <button
                onClick={() => {
                  setSelectedCategory('Todas');
                  setSelectedNeighborhood('Todos');
                  setPriceFilters([]);
                  setOnlyOpen(false);
                  setMaxDeliveryFee(3000);
                  onSearchChange('');
                }}
                className="mt-4 px-4 py-2 rounded-lg bg-stone-900 text-white text-xs font-bold hover:bg-stone-800 transition-colors cursor-pointer"
              >
                Ver todos los 20 locales de San Miguel de Tucumán
              </button>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};
