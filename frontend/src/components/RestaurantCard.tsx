import React from 'react';
import { Star, Clock, MapPin } from 'lucide-react';
import { Restaurant } from '../types';

interface RestaurantCardProps {
  restaurant: Restaurant;
  onSelect: (restaurantId: string) => void;
  onViewOnMap?: (restaurantId: string) => void;
}

export const RestaurantCard: React.FC<RestaurantCardProps> = ({
  restaurant,
  onSelect,
  onViewOnMap,
}) => {
  return (
    <div
      onClick={() => onSelect(restaurant.id)}
      className="group bg-white rounded-xl border border-stone-200 overflow-hidden hover:border-stone-400 hover:shadow-md transition-all flex flex-col justify-between cursor-pointer"
    >
      <div>
        {/* Cover Image */}
        <div className="relative h-40 sm:h-44 w-full overflow-hidden bg-stone-100">
          <img
            src={restaurant.image}
            alt={restaurant.name}
            className="w-full h-full object-cover group-hover:scale-103 transition-transform duration-300"
            loading="lazy"
          />

          {/* Category Tag */}
          <div className="absolute top-2.5 left-2.5 bg-stone-900/80 backdrop-blur-xs text-white text-[11px] font-medium px-2 py-0.5 rounded">
            {restaurant.category}
          </div>

          {/* Open/Closed status */}
          <div className="absolute top-2.5 right-2.5">
            {restaurant.isOpen ? (
              <span className="bg-white/95 text-emerald-800 text-[11px] font-bold px-2 py-0.5 rounded shadow-xs flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span>
                Abierto
              </span>
            ) : (
              <span className="bg-stone-900/90 text-stone-300 text-[11px] font-semibold px-2 py-0.5 rounded shadow-xs">
                Cerrado
              </span>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="p-4">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-bold text-stone-900 text-base leading-snug group-hover:text-red-700 transition-colors truncate">
              {restaurant.name}
            </h3>
            <div className="flex items-center gap-1 bg-stone-50 border border-stone-200 px-1.5 py-0.5 rounded text-xs shrink-0">
              <Star className="w-3 h-3 text-amber-500 fill-amber-500" />
              <span className="font-bold text-stone-900">{restaurant.rating}</span>
              <span className="text-[10px] text-stone-500">({restaurant.reviewsCount})</span>
            </div>
          </div>

          <div className="flex items-center gap-1 text-xs text-stone-500 mt-1.5 truncate">
            <MapPin className="w-3.5 h-3.5 text-stone-400 shrink-0" />
            <span className="truncate">{restaurant.address}, {restaurant.neighborhood}</span>
          </div>

          {/* Delivery & Min Order info */}
          <div className="mt-3 pt-3 border-t border-stone-100 flex items-center justify-between text-xs text-stone-600">
            <div className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-stone-400" />
              <span>{restaurant.estimatedDeliveryTime}</span>
            </div>
            <span>·</span>
            <div>
              <span>Envío: ${restaurant.deliveryFee.toLocaleString('es-AR')}</span>
            </div>
            <span>·</span>
            <div className="text-[11px] text-stone-500">
              Mín. ${restaurant.minOrder.toLocaleString('es-AR')}
            </div>
          </div>
        </div>
      </div>

      {/* Action Footer */}
      <div className="px-4 pb-3 pt-1 flex items-center justify-between gap-2 bg-stone-50/60 border-t border-stone-100 text-xs">
        <span className="text-[11px] text-stone-500 truncate">
          {restaurant.products.length} platos en carta
        </span>
        <div className="flex items-center gap-2">
          {onViewOnMap && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onViewOnMap(restaurant.id);
              }}
              className="text-[11px] font-semibold text-stone-600 hover:text-stone-900 p-1 hover:underline cursor-pointer"
            >
              Ver mapa
            </button>
          )}
          <span className="font-bold text-red-700 group-hover:translate-x-0.5 transition-transform text-xs">
            Ver carta →
          </span>
        </div>
      </div>
    </div>
  );
};
