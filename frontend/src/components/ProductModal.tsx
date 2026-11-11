import React, { useState } from 'react';
import { Product, Restaurant } from '../types';
import { X, Plus, Minus } from 'lucide-react';

interface ProductModalProps {
  product: Product;
  restaurant: Restaurant;
  onClose: () => void;
  onAddToCart: (product: Product, quantity: number, notes?: string) => void;
}

export const ProductModal: React.FC<ProductModalProps> = ({
  product,
  restaurant,
  onClose,
  onAddToCart,
}) => {
  const [quantity, setQuantity] = useState(1);
  const [notes, setNotes] = useState('');

  const totalPrice = product.price * quantity;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-xs">
      <div
        className="bg-white rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl border border-stone-200 animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header photo & close */}
        <div className="relative h-56 w-full bg-stone-100">
          <img
            src={product.image}
            alt={product.name}
            className="w-full h-full object-cover"
          />
          <button
            onClick={onClose}
            className="absolute top-3 right-3 p-1.5 rounded-full bg-stone-900/70 hover:bg-stone-900 text-white transition-colors cursor-pointer"
            title="Cerrar"
          >
            <X className="w-4 h-4" />
          </button>
          <div className="absolute bottom-3 left-3 bg-stone-900/80 text-white text-xs font-medium px-2 py-0.5 rounded">
            {product.category}
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-stone-900">{product.name}</h2>
              <div className="text-xs text-stone-500 mt-0.5">
                {restaurant.name} · {restaurant.neighborhood}
              </div>
            </div>
            <div className="text-xl font-black text-stone-900">
              ${product.price.toLocaleString('es-AR')}
            </div>
          </div>

          <p className="text-xs text-stone-600 mt-3 leading-relaxed">
            {product.description}
          </p>

          {/* Customer notes */}
          <div className="mt-4">
            <label className="block text-xs font-bold text-stone-700 mb-1">
              Aclaraciones para la cocina (opcional)
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ej: Sin sal añadida, limón cortado al medio, pan bien tostado..."
              className="w-full p-2.5 rounded-lg border border-stone-200 text-xs text-stone-800 placeholder:text-stone-400 focus:outline-none focus:border-stone-400"
            />
          </div>

          {/* Quantity and Add to cart */}
          <div className="mt-6 pt-4 border-t border-stone-100 flex items-center justify-between gap-4">
            <div className="flex items-center gap-2 border border-stone-200 rounded-lg p-1 bg-stone-50">
              <button
                type="button"
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                className="w-8 h-8 rounded bg-white text-stone-700 flex items-center justify-center hover:bg-stone-100 transition-colors cursor-pointer border border-stone-200"
                disabled={quantity <= 1}
              >
                <Minus className="w-3.5 h-3.5" />
              </button>
              <span className="w-8 text-center text-xs font-bold text-stone-900">
                {quantity}
              </span>
              <button
                type="button"
                onClick={() => setQuantity((q) => q + 1)}
                className="w-8 h-8 rounded bg-white text-stone-700 flex items-center justify-center hover:bg-stone-100 transition-colors cursor-pointer border border-stone-200"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>

            <button
              onClick={() => {
                onAddToCart(product, quantity, notes.trim() || undefined);
                onClose();
              }}
              className="flex-1 py-3 px-4 rounded-xl bg-stone-900 hover:bg-stone-800 text-white text-xs font-bold transition-colors flex items-center justify-between shadow-xs cursor-pointer"
            >
              <span>Agregar al pedido</span>
              <span>${totalPrice.toLocaleString('es-AR')}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
