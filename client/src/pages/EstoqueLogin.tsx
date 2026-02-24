import React, { useState } from 'react';
import { useLocation } from 'wouter';
import { useUserManagement } from '@/contexts/UserManagementContext';
import { IndustrialButton } from '@/components/IndustrialButton';

export default function EstoqueLogin() {
  const [, setLocation] = useLocation();
  const { users, authenticateUser } = useUserManagement();
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');

  const handleKeypad = (digit: string) => {
    if (pin.length < 4) {
      setPin(pin + digit);
    }
  };

  const handleBackspace = () => {
    setPin(pin.slice(0, -1));
  };

  const handleLogin = () => {
    const user = authenticateUser(pin);
    if (user) {
      setError('');
      setPin('');
      // Route based on role
      if (user.role === 'admin') {
        setLocation('/admin');
      } else if (user.role === 'gerente') {
        setLocation('/manager');
      } else {
        setLocation('/operator');
      }
    } else {
      setError('PIN incorreto');
      setPin('');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleLogin();
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex flex-col items-center justify-center p-4">
      {/* Header */}
      <div className="mb-12 text-center">
        <h1 className="text-5xl font-black text-white mb-2">ESTOQUE</h1>
        <p className="text-slate-400 text-lg">Sistema de Inventário PVC</p>
        <div className="h-1 w-16 bg-blue-600 mx-auto mt-4 rounded-full"></div>
      </div>

      {/* Main Container */}
      <div className="w-full max-w-md">
        {/* User Info */}
        <div className="mb-6 bg-slate-800/50 border-2 border-slate-700 rounded-lg p-4 text-center">
          <p className="text-slate-400 text-xs font-bold mb-3">USUÁRIOS DISPONÍVEIS:</p>
          <div className="space-y-2 text-sm max-h-32 overflow-y-auto">
            {users.map(u => (
              <p key={u.id} className="text-slate-300">
                <span className="font-semibold">{u.name}</span>
                <br />
                <span className="text-slate-500 text-xs">
                  {u.role === 'admin' && '🔐 Admin'} 
                  {u.role === 'gerente' && '👔 Gerente'} 
                  {u.role === 'operador' && '👷 Operador'}
                  {' '}• PIN: {u.pin}
                </span>
              </p>
            ))}
          </div>
        </div>

        {/* PIN Input */}
        <div className="mb-8 bg-slate-800/50 border-3 border-slate-700 rounded-2xl p-8">
          <label className="block text-white text-sm font-bold mb-4">Digite seu PIN</label>
          <div className="bg-black/50 rounded-xl p-6 mb-6 border-3 border-white/20">
            <div className="text-5xl font-bold text-center text-white font-mono tracking-widest">
              {'●'.repeat(pin.length)}{'○'.repeat(4 - pin.length)}
            </div>
          </div>

          {/* Numeric Keypad */}
          <div className="grid grid-cols-3 gap-2 mb-6">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
              <button
                key={num}
                onClick={() => handleKeypad(num.toString())}
                className="p-4 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-bold rounded-lg transition-colors text-xl min-h-[56px]"
              >
                {num}
              </button>
            ))}
            <button
              onClick={() => handleKeypad('0')}
              className="col-span-2 p-4 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-bold rounded-lg transition-colors text-xl min-h-[56px]"
            >
              0
            </button>
            <button
              onClick={handleBackspace}
              className="p-4 bg-red-600 hover:bg-red-700 active:bg-red-800 text-white font-bold rounded-lg transition-colors text-lg min-h-[56px]"
            >
              ← DEL
            </button>
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-900/50 border-2 border-red-500 rounded-lg p-4 mb-6">
              <p className="text-red-300 text-sm font-semibold">⚠️ {error}</p>
            </div>
          )}

          {/* Login Button */}
          <IndustrialButton
            size="lg"
            variant="success"
            onClick={handleLogin}
            className="w-full"
            onKeyPress={handleKeyPress}
          >
            Entrar
          </IndustrialButton>
        </div>

        {/* Footer Info */}
        <div className="text-center text-slate-500 text-xs">
          <p>Sistema de Controle de Inventário</p>
          <p>Fábrica de PVC</p>
        </div>
      </div>
    </div>
  );
}
