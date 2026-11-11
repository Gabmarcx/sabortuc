import React, { useState } from 'react';
import { UserProfile } from '../types';
import { Lock, Mail, User, Phone, CheckCircle2, ArrowRight } from 'lucide-react';

interface AuthScreenProps {
  onLoginSuccess: (user: UserProfile) => void;
  onCancel: () => void;
}

export const AuthScreen: React.FC<AuthScreenProps> = ({
  onLoginSuccess,
  onCancel,
}) => {
  const [tab, setTab] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('jazmin.berdu20@gmail.com');
  const [password, setPassword] = useState('••••••••');
  const [name, setName] = useState('Jazmín Berdú');
  const [phone, setPhone] = useState('+54 381 482-9910');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onLoginSuccess({
      id: 'usr-1',
      name: tab === 'login' ? 'Jazmín Berdú' : name,
      email,
      phone,
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
      ],
    });
  };

  const handleQuickDemoLogin = () => {
    onLoginSuccess({
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
      ],
    });
  };

  return (
    <div className="max-w-md mx-auto px-4 py-12">
      <div className="bg-white rounded-2xl border border-stone-200 p-8 shadow-sm">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="w-10 h-10 rounded-xl bg-stone-900 text-white flex items-center justify-center font-bold text-base mx-auto mb-3">
            ST
          </div>
          <h1 className="text-xl font-bold text-stone-900">
            {tab === 'login' ? 'Iniciar Sesión en SaborTUC' : 'Crear Cuenta en SaborTUC'}
          </h1>
          <p className="text-xs text-stone-500 mt-1">
            Plataforma de pedidos gastronómicos de San Miguel de Tucumán
          </p>
        </div>

        {/* Tab switch */}
        <div className="flex border-b border-stone-200 mb-6">
          <button
            type="button"
            onClick={() => setTab('login')}
            className={`flex-1 pb-2.5 text-xs font-bold border-b-2 text-center transition-colors cursor-pointer ${
              tab === 'login'
                ? 'border-stone-900 text-stone-900'
                : 'border-transparent text-stone-400 hover:text-stone-700'
            }`}
          >
            Iniciar Sesión
          </button>
          <button
            type="button"
            onClick={() => setTab('register')}
            className={`flex-1 pb-2.5 text-xs font-bold border-b-2 text-center transition-colors cursor-pointer ${
              tab === 'register'
                ? 'border-stone-900 text-stone-900'
                : 'border-transparent text-stone-400 hover:text-stone-700'
            }`}
          >
            Registrarse
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {tab === 'register' && (
            <>
              <div>
                <label className="block font-bold text-stone-700 mb-1">Nombre y Apellido</label>
                <div className="relative">
                  <User className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Tu nombre"
                    className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-stone-200 focus:outline-none focus:border-stone-400"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-stone-700 mb-1">Teléfono en Tucumán</label>
                <div className="relative">
                  <Phone className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
                  <input
                    type="text"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+54 381 ..."
                    className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-stone-200 focus:outline-none focus:border-stone-400"
                  />
                </div>
              </div>
            </>
          )}

          <div>
            <label className="block font-bold text-stone-700 mb-1">Correo Electrónico</label>
            <div className="relative">
              <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="ejemplo@correo.com"
                className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-stone-200 focus:outline-none focus:border-stone-400"
              />
            </div>
          </div>

          <div>
            <label className="block font-bold text-stone-700 mb-1">Contraseña</label>
            <div className="relative">
              <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-stone-200 focus:outline-none focus:border-stone-400"
              />
            </div>
          </div>

          <button
            type="submit"
            className="w-full mt-2 py-3 px-4 rounded-xl bg-stone-900 hover:bg-stone-800 text-white font-bold text-xs transition-colors cursor-pointer shadow-xs"
          >
            {tab === 'login' ? 'Ingresar a mi cuenta' : 'Crear cuenta'}
          </button>
        </form>

        {/* Demo Quick login button */}
        <div className="mt-6 pt-4 border-t border-stone-100 text-center">
          <p className="text-[11px] text-stone-500 mb-2">Para fines de prueba del prototipo:</p>
          <button
            type="button"
            onClick={handleQuickDemoLogin}
            className="w-full py-2 px-3 rounded-lg border border-stone-200 bg-stone-50 hover:bg-stone-100 text-xs font-semibold text-stone-700 transition-colors cursor-pointer"
          >
            Ingresar como Cliente Demostración (Jazmín Berdú)
          </button>
        </div>

        <div className="mt-4 text-center">
          <button
            type="button"
            onClick={onCancel}
            className="text-xs text-stone-400 hover:text-stone-700 underline"
          >
            Volver a la tienda
          </button>
        </div>
      </div>
    </div>
  );
};
