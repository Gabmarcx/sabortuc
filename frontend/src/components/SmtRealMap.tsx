import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import { Restaurant } from '../types';

interface SmtRealMapProps {
  restaurants: Restaurant[];
  selectedRestaurantId?: string | null;
  onSelectRestaurant: (restaurantId: string) => void;
  className?: string;
  zoom?: number;
}

export const SmtRealMap: React.FC<SmtRealMapProps> = ({
  restaurants,
  selectedRestaurantId,
  onSelectRestaurant,
  className = 'h-[500px] w-full',
  zoom = 14,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersRef = useRef<Record<string, L.Marker>>({});

  useEffect(() => {
    if (!mapContainerRef.current) return;

    // Center of San Miguel de Tucumán (Plaza Independencia / Casa Histórica)
    const smtCenter: [number, number] = [-26.829, -65.204];

    // Initialize Leaflet map
    const map = L.map(mapContainerRef.current, {
      center: smtCenter,
      zoom: zoom,
      zoomControl: true,
      scrollWheelZoom: true,
    });

    // Real OpenStreetMap TileLayer
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors | SMT',
    }).addTo(map);

    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Update markers when restaurants change
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    // Clear old markers
    Object.values(markersRef.current).forEach((m) => m.remove());
    markersRef.current = {};

    restaurants.forEach((restaurant) => {
      const isSelected = restaurant.id === selectedRestaurantId;

      // Custom Clean Pin Icon
      const customIcon = L.divIcon({
        className: 'custom-smt-pin',
        html: `
          <div style="
            background-color: ${isSelected ? '#b91c1c' : '#1e293b'};
            color: #ffffff;
            padding: 4px 8px;
            border-radius: 8px;
            font-size: 11px;
            font-weight: 700;
            display: flex;
            align-items: center;
            gap: 4px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.25);
            border: 2px solid ${isSelected ? '#ffffff' : '#e2e8f0'};
            transform: translate(-50%, -100%);
            white-space: nowrap;
            cursor: pointer;
            transition: transform 0.2s;
          ">
            <span>${restaurant.name}</span>
            <span style="color: #fbbf24; font-size: 10px;">★${restaurant.rating}</span>
          </div>
        `,
        iconSize: [0, 0],
        iconAnchor: [0, 0],
      });

      const marker = L.marker([restaurant.coordinates.lat, restaurant.coordinates.lng], {
        icon: customIcon,
      }).addTo(map);

      // Popup Content
      const popupHtml = `
        <div style="font-family: inherit; min-width: 200px; padding: 2px;">
          <div style="font-size: 10px; font-weight: 700; color: #b91c1c; text-transform: uppercase; margin-bottom: 2px;">
            ${restaurant.category} · ${restaurant.neighborhood}
          </div>
          <div style="font-size: 14px; font-weight: 800; color: #0f172a; margin-bottom: 2px;">
            ${restaurant.name}
          </div>
          <div style="font-size: 11px; color: #64748b; margin-bottom: 6px;">
            📍 ${restaurant.address}, San Miguel de Tucumán
          </div>
          <div style="font-size: 11px; font-weight: 600; color: #334155; margin-bottom: 8px; display: flex; justify-content: space-between;">
            <span>⏱ ${restaurant.estimatedDeliveryTime}</span>
            <span>Envío: $${restaurant.deliveryFee.toLocaleString('es-AR')}</span>
          </div>
          <button 
            id="btn-popup-${restaurant.id}"
            style="
              width: 100%;
              background-color: #b91c1c;
              color: white;
              padding: 6px 10px;
              border-radius: 6px;
              font-size: 11px;
              font-weight: 700;
              border: none;
              cursor: pointer;
            ">
            Ver Carta Completa
          </button>
        </div>
      `;

      marker.bindPopup(popupHtml);

      marker.on('popupopen', () => {
        const btn = document.getElementById(`btn-popup-${restaurant.id}`);
        if (btn) {
          btn.onclick = () => {
            onSelectRestaurant(restaurant.id);
          };
        }
      });

      marker.on('click', () => {
        onSelectRestaurant(restaurant.id);
      });

      markersRef.current[restaurant.id] = marker;
    });
  }, [restaurants, selectedRestaurantId, onSelectRestaurant]);

  // Pan to selected restaurant if changed
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !selectedRestaurantId) return;

    const target = restaurants.find((r) => r.id === selectedRestaurantId);
    if (target) {
      map.flyTo([target.coordinates.lat, target.coordinates.lng], 16, {
        duration: 1.2,
      });

      const marker = markersRef.current[selectedRestaurantId];
      if (marker && !marker.isPopupOpen()) {
        marker.openPopup();
      }
    }
  }, [selectedRestaurantId, restaurants]);

  return (
    <div className={`relative rounded-xl overflow-hidden border border-stone-200 shadow-sm ${className}`}>
      <div ref={mapContainerRef} className="w-full h-full" />
      <div className="absolute top-3 right-3 z-[1000] bg-white/95 backdrop-blur-xs px-3 py-1.5 rounded-lg border border-stone-200 text-[11px] font-semibold text-stone-700 shadow-sm flex items-center gap-1.5 pointer-events-none">
        <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
        <span>OpenStreetMap · San Miguel de Tucumán</span>
      </div>
    </div>
  );
};
