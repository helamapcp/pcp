import React, { useState } from 'react';
import { useLocation } from 'wouter';
import { IndustrialButton } from '@/components/IndustrialButton';
import { Smartphone, Monitor } from 'lucide-react';

export default function PVCLogin() {
  const [, setLocation] = useLocation();
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

  const handleLogin = (role: 'operator' | 'manager') => {
    if (pin === '1234') {
      setError('');
      setPin('');
      setLocation(role === 'operator' ? '/pvc-operator' : '/pvc-manager');
    } else {
      setError('PIN incorreto. Use 1234');
      setPin('');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex flex-col items-center justify-center p-4">
      {/* Header */}
      <div className="mb-12 text-center">
        <h1 className="text-5xl font-black text-white mb-2">PVC</h1>
        <p className="text-slate-400 text-lg">PCP & Inventory System</p>
        <div className="h-1 w-16 bg-blue-600 mx-auto mt-4 rounded-full"></div>
      </div>

      {/* Main Container */}
      <div className="w-full max-w-md">
        {/* PIN Input */}
        <div className="mb-8 bg-slate-800/50 border-3 border-slate-700 rounded-2xl p-8">
          <label className="block text-white text-sm font-bold mb-4">Digite seu PIN</label>
          <div className="bg-black/50 rounded-xl p-6 mb-6 border-3 border-white/20">
            <div className="text-5xl font-bold text-center text-white font-mono tracking-widest">
              {'●'.repeat(pin.length)}{'○'.repeat(4 - pin.length)}
            </div>
          </div>

          {/* Numeric Keypad */}
          <div className="grid grid-cols-3 gap-3 mb-6">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
              <button
                key={num}
                onClick={() => handleKeypad(num.toString())}
                className="p-4 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-bold rounded-lg transition-colors text-2xl min-h-[56px]"
              >
                {num}
              </button>
            ))}
            <button
              onClick={() => handleKeypad('0')}
              className="col-span-2 p-4 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-bold rounded-lg transition-colors text-2xl min-h-[56px]"
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
            <div className="bg-red-900/50 border-2 border-red-500 rounded-lg p-3 mb-6">
              <p className="text-red-300 text-sm font-semibold">⚠️ {error}</p>
            </div>
          )}

          {/* Info */}
          <div className="bg-slate-700/50 border border-slate-600 rounded-lg p-3">
            <p className="text-slate-300 text-xs text-center">Demo PIN: <span className="font-bold">1234</span></p>
          </div>
        </div>

        {/* Role Selection */}
        <div className="space-y-3">
          <IndustrialButton
            size="xl"
            variant="primary"
            onClick={() => handleLogin('operator')}
            icon={<Smartphone className="w-6 h-6" />}
            fullWidth
          >
            Operador de Chão
          </IndustrialButton>
          <IndustrialButton
            size="xl"
            variant="secondary"
            onClick={() => handleLogin('manager')}
            icon={<Monitor className="w-6 h-6" />}
            fullWidth
          >
            Gerente de PCP
          </IndustrialButton>
        </div>
      </div>
    </div>
  );
}
