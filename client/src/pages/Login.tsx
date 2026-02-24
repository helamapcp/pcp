import React, { useState } from 'react';
import { useLocation } from 'wouter';
import { IndustrialButton } from '@/components/IndustrialButton';
import { Smartphone, Monitor } from 'lucide-react';

export default function Login() {
  const [, setLocation] = useLocation();
  const [userType, setUserType] = useState<'operator' | 'manager' | null>(null);
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');

  const handlePinInput = (digit: string) => {
    if (pin.length < 4) {
      setPin(pin + digit);
    }
  };

  const handleBackspace = () => {
    setPin(pin.slice(0, -1));
  };

  const handleLogin = () => {
    if (pin === '1234') {
      setError('');
      if (userType === 'operator') {
        setLocation('/operator');
      } else if (userType === 'manager') {
        setLocation('/manager');
      }
    } else {
      setError('PIN inválido. Tente novamente.');
      setPin('');
    }
  };

  const handleQuickAccess = (type: 'operator' | 'manager') => {
    if (type === 'operator') {
      setLocation('/operator');
    } else {
      setLocation('/manager');
    }
  };

  if (!userType) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-900 via-blue-800 to-blue-950 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-12">
            <div className="inline-block bg-white/10 backdrop-blur-md rounded-2xl p-6 mb-6">
              <div className="text-5xl font-bold text-white">PVC</div>
              <div className="text-sm text-blue-100 mt-2">PCP & Inventory System</div>
            </div>
            <h1 className="text-3xl font-bold text-white mb-2">Bem-vindo ao Sistema</h1>
            <p className="text-blue-100">Selecione seu perfil para continuar</p>
          </div>

          <div className="space-y-4">
            <IndustrialButton
              size="xl"
              variant="primary"
              onClick={() => setUserType('operator')}
              icon={<Smartphone className="w-6 h-6" />}
              className="text-lg"
            >
              Operador de Chão
            </IndustrialButton>

            <IndustrialButton
              size="xl"
              variant="secondary"
              onClick={() => setUserType('manager')}
              icon={<Monitor className="w-6 h-6" />}
              className="text-lg"
            >
              Gerente de PCP
            </IndustrialButton>
          </div>

          <div className="mt-8 p-4 bg-white/5 backdrop-blur-md rounded-lg border border-white/10">
            <p className="text-xs text-blue-100 text-center">
              <strong>Demo:</strong> Use PIN 1234 para qualquer perfil
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-blue-800 to-blue-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <button
            onClick={() => {
              setUserType(null);
              setPin('');
              setError('');
            }}
            className="text-blue-200 hover:text-white text-sm mb-4 underline"
          >
            ← Voltar
          </button>
          <h2 className="text-2xl font-bold text-white mb-2">
            {userType === 'operator' ? 'Operador de Chão' : 'Gerente de PCP'}
          </h2>
          <p className="text-blue-100">Digite seu PIN de 4 dígitos</p>
        </div>

        <div className="bg-white/10 backdrop-blur-md rounded-2xl p-8 border border-white/20">
          {/* PIN Display */}
          <div className="mb-8 p-6 bg-black/30 rounded-xl border-2 border-white/20">
            <div className="flex justify-center gap-3">
              {[0, 1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="w-16 h-16 bg-white/10 rounded-lg flex items-center justify-center text-2xl font-bold text-white border-2 border-white/30"
                >
                  {pin[i] ? '●' : '○'}
                </div>
              ))}
            </div>
          </div>

          {error && (
            <div className="mb-6 p-3 bg-red-500/20 border border-red-500 rounded-lg text-red-100 text-center text-sm">
              {error}
            </div>
          )}

          {/* Numeric Keypad */}
          <div className="grid grid-cols-3 gap-3 mb-6">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
              <button
                key={num}
                onClick={() => handlePinInput(num.toString())}
                className="p-4 bg-blue-600 hover:bg-blue-700 text-white text-xl font-bold rounded-lg transition-colors"
              >
                {num}
              </button>
            ))}
            <button
              onClick={() => handlePinInput('0')}
              className="col-span-2 p-4 bg-blue-600 hover:bg-blue-700 text-white text-xl font-bold rounded-lg transition-colors"
            >
              0
            </button>
            <button
              onClick={handleBackspace}
              className="p-4 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg transition-colors"
            >
              ←
            </button>
          </div>

          {/* Login Button */}
          <IndustrialButton
            size="xl"
            variant="success"
            onClick={handleLogin}
            disabled={pin.length !== 4}
            className="disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Entrar
          </IndustrialButton>

          {/* Quick Access for Demo */}
          <button
            onClick={() => handleQuickAccess(userType)}
            className="w-full mt-4 text-xs text-blue-200 hover:text-white underline"
          >
            Acesso Rápido (Demo)
          </button>
        </div>
      </div>
    </div>
  );
}
