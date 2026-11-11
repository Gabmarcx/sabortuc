import React from 'react';
import { ActiveScreen } from '../types';
import { MapPin, ShieldCheck } from 'lucide-react';

interface FooterProps {
  onNavigate: (screen: ActiveScreen) => void;
  restaurantsCount: number;
}

export const Footer: React.FC<FooterProps> = ({
  onNavigate,
  restaurantsCount,
}) => {
  return (
    <footer className="bg-stone-900 text-stone-300 border-t border-stone-800 mt-auto text-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Col 1: Platform Concept */}
          <div className="md:col-span-2 space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-white text-stone-900 flex items-center justify-center font-black text-xs">
                ST
              </div>
              <span className="font-extrabold text-white text-base">
                Sabor<span className="text-red-500">TUC</span> · San Miguel de Tucumán
              </span>
            </div>
            <p className="text-stone-400 text-xs max-w-md leading-relaxed">
              Plataforma web de pedidos y delivery gastronómico para San Miguel de Tucumán, Argentina.
            </p>
            <div className="flex items-center gap-2 text-stone-400 text-[11px] pt-1">
              <MapPin className="w-3.5 h-3.5 text-red-500 shrink-0" />
              <span>Cobertura exclusiva: San Miguel de Tucumán (Barrio Norte, Centro, Barrio Sur)</span>
            </div>
          </div>

          {/* Col 2: Navigation */}
          <div>
            <div className="font-bold text-white uppercase text-[11px] tracking-wider mb-3">
              Exploración de la Plataforma
            </div>
            <ul className="space-y-2 text-stone-400">
              <li>
                <button
                  onClick={() => onNavigate('explore')}
                  className="hover:text-white transition-colors cursor-pointer"
                >
                  Inicio y feed gastronómico
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigate('catalog')}
                  className="hover:text-white transition-colors cursor-pointer"
                >
                  Catálogo ({restaurantsCount} locales de SMT)
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigate('map')}
                  className="hover:text-white transition-colors cursor-pointer"
                >
                  Mapa interactivo OpenStreetMap
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigate('orders')}
                  className="hover:text-white transition-colors cursor-pointer"
                >
                  Historial y seguimiento de pedidos
                </button>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-stone-800 flex flex-col sm:flex-row items-center justify-between text-stone-500 text-[11px] gap-2">
          <div>
            © {new Date().getFullYear()} SaborTUC. San Miguel de Tucumán, Provincia de Tucumán, Argentina.
          </div>
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
            <span>Datos georreferenciados con OpenStreetMap</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
