import React, { useState } from 'react';
import {
  Restaurant,
  RestaurantCategory,
  SmtNeighborhood,
  FilterParams,
} from '../types';
import { RestaurantCard } from '../components/RestaurantCard';
import { SmtRealMap } from '../components/SmtRealMap';
import {
  MapPin,
  List,
  Map as MapIcon,
  SlidersHorizontal,
  Flame,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';

interface ExploreScreenProps {
  restaurants: Restaurant[];
  onSelectRestaurant: (restaurantId: string) => void;
  onNavigateToCatalog: () => void;
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

const NEIGHBORHOODS: (SmtNeighborhood | 'Todos')[] = [
  'Todos',
  'Barrio Norte',
  'Centro',
  'Barrio Sur',
  'Plaza Independencia',
  'Centro Histórico',
];

export const ExploreScreen: React.FC<ExploreScreenProps> = ({
  restaurants,
  onSelectRestaurant,
  onNavigateToCatalog,
  searchQuery,
  onSearchChange,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<RestaurantCategory>('Todas');
  const [selectedNeighborhood, setSelectedNeighborhood] = useState<SmtNeighborhood | 'Todos'>('Todos');
  const [onlyOpen, setOnlyOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'split'>('grid');
  const [highlightedRestaurantId, setHighlightedRestaurantId] = useState<string | null>(null);

  // Filter logic
  const filtered = restaurants.filter((r) => {
    const matchesCategory = selectedCategory === 'Todas' || r.category === selectedCategory;
    const matchesNeighborhood = selectedNeighborhood === 'Todos' || r.neighborhood === selectedNeighborhood;
    const matchesOpen = !onlyOpen || r.isOpen;
    const matchesSearch =
      !searchQuery.trim() ||
      r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.address.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.neighborhood.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.products.some((p) => p.name.toLowerCase().includes(searchQuery.toLowerCase()));

    return matchesCategory && matchesNeighborhood && matchesOpen && matchesSearch;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-col gap-6">
      {/* City & Scope Banner */}
      <div className="bg-stone-900 text-white rounded-2xl p-6 shadow-sm border border-stone-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-stone-300 text-xs font-semibold mb-1">
            <MapPin className="w-4 h-4 text-red-500" />
            <span>SAN MIGUEL DE TUCUMÁN · ZONA DE COBERTURA ACTIVA</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Gastronomía de San Miguel de Tucumán
          </h1>
          <p className="text-xs sm:text-sm text-stone-400 mt-1 max-w-2xl leading-relaxed">
            Plataforma conectada a restaurantes, cafeterías, pizzerías y bodegones históricos de Barrio Norte, Centro y Barrio Sur.
          </p>
        </div>

        <div className="flex items-center gap-3 bg-stone-800/80 p-3 rounded-xl border border-stone-700 text-xs">
          <div>
            <div className="text-xl font-black text-white">{restaurants.length}</div>
            <div className="text-[11px] text-stone-400 font-medium">Locales SMT</div>
          </div>
          <div className="w-px h-8 bg-stone-700"></div>
          <div>
            <div className="text-xl font-black text-emerald-400">
              {restaurants.filter((r) => r.isOpen).length}
            </div>
            <div className="text-[11px] text-stone-400 font-medium">Abiertos ahora</div>
          </div>
        </div>
      </div>

      {/* Categories Bar */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none border-b border-stone-200">
        {CATEGORIES.map((cat) => (
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

      {/* Filter and View Controls Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3 rounded-xl border border-stone-200">
        {/* Left filters: Neighborhood and Open only */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Neighborhood filter */}
          <div className="flex items-center gap-1 text-xs">
            <span className="text-stone-500 font-medium hidden sm:inline">Zona:</span>
            <select
              value={selectedNeighborhood}
              onChange={(e) => setSelectedNeighborhood(e.target.value as any)}
              className="py-1 px-2.5 rounded-lg border border-stone-200 bg-stone-50 text-xs text-stone-800 font-medium focus:outline-none"
            >
              {NEIGHBORHOODS.map((n) => (
                <option key={n} value={n}>
                  {n === 'Todos' ? 'Todo SMT' : n}
                </option>
              ))}
            </select>
          </div>

          {/* Open only toggle */}
          <button
            onClick={() => setOnlyOpen(!onlyOpen)}
            className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors cursor-pointer ${
              onlyOpen
                ? 'bg-emerald-50 text-emerald-800 border-emerald-300 font-bold'
                : 'bg-stone-50 text-stone-600 border-stone-200 hover:bg-stone-100'
            }`}
          >
            {onlyOpen ? '✓ Solo Abiertos' : 'Solo Abiertos'}
          </button>

          <span className="text-xs text-stone-400 hidden md:inline">|</span>

          <span className="text-xs text-stone-600 font-medium">
            {filtered.length} {filtered.length === 1 ? 'establecimiento' : 'establecimientos'}
          </span>
        </div>

        {/* Right: View mode toggle */}
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-stone-100 p-0.5 rounded-lg border border-stone-200">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-md text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer ${
                viewMode === 'grid'
                  ? 'bg-white text-stone-900 shadow-xs'
                  : 'text-stone-500 hover:text-stone-900'
              }`}
              title="Vista de cuadrícula"
            >
              <List className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Lista</span>
            </button>
            <button
              onClick={() => setViewMode('split')}
              className={`p-1.5 rounded-md text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer ${
                viewMode === 'split'
                  ? 'bg-white text-stone-900 shadow-xs'
                  : 'text-stone-500 hover:text-stone-900'
              }`}
              title="Vista dividida con mapa"
            >
              <MapIcon className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Mapa y Lista</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {filtered.map((restaurant) => (
            <RestaurantCard
              key={restaurant.id}
              restaurant={restaurant}
              onSelect={onSelectRestaurant}
              onViewOnMap={(id) => {
                setHighlightedRestaurantId(id);
                setViewMode('split');
              }}
            />
          ))}

          {filtered.length === 0 && (
            <div className="col-span-full py-16 text-center bg-white rounded-2xl border border-stone-200 p-8">
              <div className="text-stone-400 mb-2">
                <SlidersHorizontal className="w-8 h-8 mx-auto stroke-1" />
              </div>
              <h3 className="text-base font-bold text-stone-800">
                No se encontraron establecimientos
              </h3>
              <p className="text-xs text-stone-500 mt-1 max-w-sm mx-auto">
                No hay resultados para "{searchQuery}" con los filtros actuales en San Miguel de Tucumán.
              </p>
              <button
                onClick={() => {
                  setSelectedCategory('Todas');
                  setSelectedNeighborhood('Todos');
                  setOnlyOpen(false);
                  onSearchChange('');
                }}
                className="mt-4 px-4 py-2 rounded-lg bg-stone-900 text-white text-xs font-bold hover:bg-stone-800 transition-colors cursor-pointer"
              >
                Restablecer filtros
              </button>
            </div>
          )}
        </div>
      ) : (
        /* Split View: List on left, Real OSM Map on right */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-5 flex flex-col gap-3 max-h-[720px] overflow-y-auto pr-1">
            {filtered.map((restaurant) => (
              <div
                key={restaurant.id}
                onMouseEnter={() => setHighlightedRestaurantId(restaurant.id)}
                className={`transition-all ${
                  highlightedRestaurantId === restaurant.id
                    ? 'ring-2 ring-red-600 rounded-xl'
                    : ''
                }`}
              >
                <RestaurantCard
                  restaurant={restaurant}
                  onSelect={onSelectRestaurant}
                />
              </div>
            ))}
          </div>

          <div className="lg:col-span-7 sticky top-20">
            <SmtRealMap
              restaurants={filtered}
              selectedRestaurantId={highlightedRestaurantId}
              onSelectRestaurant={(id) => {
                setHighlightedRestaurantId(id);
                onSelectRestaurant(id);
              }}
              className="h-[680px] w-full"
            />
          </div>
        </div>
      )}
    </div>
  );
};
