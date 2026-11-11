import React, { useState } from 'react';
import { Restaurant, SmtNeighborhood } from '../types';
import { SmtRealMap } from '../components/SmtRealMap';
import {
  MapPin,
  Star,
  Clock,
  Compass,
  ArrowRight,
  ArrowLeft,
  Home,
  Filter,
  CheckCircle2,
  Navigation,
} from 'lucide-react';

interface InteractiveMapScreenProps {
  restaurants: Restaurant[];
  onSelectRestaurant: (restaurantId: string) => void;
  onNavigateToCatalog: () => void;
  onNavigateToHome?: () => void;
}

export const InteractiveMapScreen: React.FC<InteractiveMapScreenProps> = ({
  restaurants,
  onSelectRestaurant,
  onNavigateToCatalog,
  onNavigateToHome,
}) => {
  const [selectedNeighborhood, setSelectedNeighborhood] = useState<string>('Todos');
  const [selectedRestaurantId, setSelectedRestaurantId] = useState<string | null>(restaurants[0]?.id || null);

  const filtered = restaurants.filter(
    (r) => selectedNeighborhood === 'Todos' || r.neighborhood === selectedNeighborhood
  );

  const activeRestaurant = restaurants.find((r) => r.id === selectedRestaurantId);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-col gap-6">
      {/* Return to Home button */}
      <div className="flex items-center justify-between">
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
            Navegación / <strong className="text-stone-800">Mapa de San Miguel de Tucumán</strong>
          </span>
        )}
      </div>

      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-stone-200 pb-4">
        <div>
          <div className="flex items-center gap-1.5 text-xs font-bold text-red-700 uppercase tracking-wider mb-1">
            <Compass className="w-4 h-4" />
            <span>CARTOGRAFÍA EN VIVO OPENSTREETMAP</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-stone-900 tracking-tight">
            Mapa de San Miguel de Tucumán
          </h1>
          <p className="text-xs sm:text-sm text-stone-500 mt-1">
            Ubicación georreferenciada de los 20 establecimientos gastronómicos en el ejido urbano de SMT.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {onNavigateToHome && (
            <button
              onClick={onNavigateToHome}
              className="py-2 px-3.5 rounded-lg border border-stone-200 bg-white hover:bg-stone-50 text-xs font-bold text-stone-800 transition-colors cursor-pointer flex items-center gap-1.5"
              title="Volver al inicio"
            >
              <Home className="w-3.5 h-3.5 text-red-600" />
              <span>Volver al inicio</span>
            </button>
          )}
          <button
            onClick={onNavigateToCatalog}
            className="py-2 px-3.5 rounded-lg border border-stone-200 bg-white hover:bg-stone-50 text-xs font-semibold text-stone-800 transition-colors cursor-pointer"
          >
            Ver formato lista
          </button>
        </div>
      </div>

      {/* Main Map + Sidebar Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Interactive Sidebar */}
        <div className="lg:col-span-4 flex flex-col gap-3">
          {/* Neighborhood Quick Filter */}
          <div className="bg-white p-3 rounded-xl border border-stone-200 flex items-center justify-between gap-2">
            <span className="text-xs font-bold text-stone-700">Zona:</span>
            <div className="flex items-center gap-1 overflow-x-auto scrollbar-none">
              {['Todos', 'Barrio Norte', 'Centro', 'Barrio Sur'].map((zone) => (
                <button
                  key={zone}
                  onClick={() => setSelectedNeighborhood(zone)}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                    selectedNeighborhood === zone
                      ? 'bg-stone-900 text-white'
                      : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                  }`}
                >
                  {zone}
                </button>
              ))}
            </div>
          </div>

          {/* Restaurant list */}
          <div className="flex flex-col gap-2.5 max-h-[580px] overflow-y-auto pr-1">
            {filtered.map((r) => {
              const isSelected = selectedRestaurantId === r.id;
              return (
                <div
                  key={r.id}
                  onClick={() => setSelectedRestaurantId(r.id)}
                  className={`p-3.5 rounded-xl border transition-all cursor-pointer bg-white ${
                    isSelected
                      ? 'border-red-700 ring-2 ring-red-100 shadow-sm'
                      : 'border-stone-200 hover:border-stone-300'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="text-[10px] font-bold text-red-700 uppercase">
                        {r.category} · {r.neighborhood}
                      </div>
                      <h4 className="font-bold text-stone-900 text-sm truncate">{r.name}</h4>
                      <p className="text-xs text-stone-500 truncate mt-0.5">
                        📍 {r.address}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="text-xs font-bold text-stone-900 flex items-center gap-0.5 justify-end">
                        ★ {r.rating}
                      </span>
                      <span className="text-[10px] text-stone-400">
                        {r.estimatedDeliveryTime}
                      </span>
                    </div>
                  </div>

                  <div className="mt-3 pt-2.5 border-t border-stone-100 flex items-center justify-between text-xs">
                    <span className="text-[11px] text-stone-600">
                      Envío: ${r.deliveryFee.toLocaleString('es-AR')}
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectRestaurant(r.id);
                      }}
                      className="text-xs font-bold text-red-700 hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <span>Ver carta</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Real Leaflet OSM Map */}
        <div className="lg:col-span-8 flex flex-col gap-3">
          <SmtRealMap
            restaurants={filtered}
            selectedRestaurantId={selectedRestaurantId}
            onSelectRestaurant={(id) => {
              setSelectedRestaurantId(id);
              onSelectRestaurant(id);
            }}
            className="h-[640px] w-full"
            zoom={15}
          />

          {/* SMT Reference Card */}
          <div className="p-3 bg-stone-50 rounded-xl border border-stone-200 flex flex-wrap items-center justify-between gap-3 text-xs text-stone-600">
            <div className="flex items-center gap-4">
              <span>📌 Cobertura: Barrio Norte, Centro y Barrio Sur</span>
              <span>·</span>
              <span>🗺️ Coordenadas oficiales de San Miguel de Tucumán</span>
            </div>
            <div className="text-[11px] font-medium text-stone-500">
              Hacé clic en cualquier marcador del mapa para abrir la ficha
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
