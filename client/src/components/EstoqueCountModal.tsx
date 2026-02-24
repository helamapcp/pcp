import React, { useState } from 'react';
import { X, Check } from 'lucide-react';
import { IndustrialButton } from './IndustrialButton';
import { toast } from 'sonner';
import type { Product, Sector } from '@/contexts/EstoqueContext';

interface EstoqueCountModalProps {
  isOpen: boolean;
  product: Product | null;
  sector: Sector | null;
  onClose: () => void;
  onSubmit: (quantity: number, unit: 'units' | 'kg') => void;
}

export function EstoqueCountModal({
  isOpen,
  product,
  sector,
  onClose,
  onSubmit,
}: EstoqueCountModalProps) {
  const [quantity, setQuantity] = useState('');
  const [unit, setUnit] = useState<'units' | 'kg'>('units');
  const [error, setError] = useState('');

  if (!isOpen || !product || !sector) return null;

  const handleKeypad = (digit: string) => {
    if (quantity.length < 8) {
      setQuantity(quantity + digit);
    }
  };

  const handleBackspace = () => {
    setQuantity(quantity.slice(0, -1));
  };

  const handleSubmit = () => {
    if (!quantity || parseInt(quantity) < 0) {
      setError('Quantidade deve ser válida');
      return;
    }

    setError('');
    onSubmit(parseInt(quantity), unit);
    setQuantity('');
    setUnit('units');
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-900 border-4 border-blue-500 rounded-2xl w-full max-w-md max-h-[95vh] overflow-y-auto shadow-2xl">
        {/* Header */}
        <div className="bg-slate-800 px-6 py-5 border-b-2 border-slate-700 flex justify-between items-center sticky top-0 z-10">
          <div>
            <h2 className="text-2xl font-bold text-white">📦 Contar Estoque</h2>
            <p className="text-slate-300 text-sm mt-1">{sector}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
          >
            <X className="w-7 h-7 text-white" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Product Info */}
          <div className="bg-slate-700/50 border-2 border-slate-600 rounded-lg p-4">
            <p className="text-slate-400 text-xs font-bold mb-1">PRODUTO</p>
            <p className="text-white font-bold text-lg">{product.name}</p>
          </div>

          {/* Quantity Display */}
          <div>
            <label className="block text-white text-base font-bold mb-3">Quantidade Atual</label>
            <div className="bg-black/50 rounded-xl p-5 mb-4 border-3 border-white/20">
              <div className="text-4xl font-bold text-white text-center font-mono">
                {quantity || '0'}
              </div>
              <p className="text-slate-400 text-xs text-center mt-2">{unit === 'units' ? 'Sacos' : 'kg'}</p>
            </div>

            {/* Numeric Keypad */}
            <div className="grid grid-cols-3 gap-2 mb-4">
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
          </div>

          {/* Unit Selection */}
          <div>
            <label className="block text-white text-base font-bold mb-3">Unidade</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setUnit('units')}
                className={`px-6 py-4 rounded-xl font-bold text-lg transition-all border-3 min-h-[56px] ${
                  unit === 'units'
                    ? 'bg-green-600 text-white border-green-500 hover:bg-green-700'
                    : 'bg-slate-700 text-slate-300 border-slate-600 hover:bg-slate-600'
                }`}
              >
                📦 Sacos
              </button>
              <button
                onClick={() => setUnit('kg')}
                className={`px-6 py-4 rounded-xl font-bold text-lg transition-all border-3 min-h-[56px] ${
                  unit === 'kg'
                    ? 'bg-green-600 text-white border-green-500 hover:bg-green-700'
                    : 'bg-slate-700 text-slate-300 border-slate-600 hover:bg-slate-600'
                }`}
              >
                ⚖️ kg
              </button>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-900/50 border-2 border-red-500 rounded-lg p-4">
              <p className="text-red-300 text-sm font-semibold">⚠️ {error}</p>
            </div>
          )}

          {/* Summary */}
          <div className="bg-slate-700/70 rounded-xl p-5 border-2 border-slate-600">
            <p className="text-slate-300 text-xs font-bold mb-2">RESUMO</p>
            <p className="text-white font-bold text-2xl">
              {quantity ? `${quantity} ${unit === 'units' ? 'sacos' : 'kg'}` : '-'}
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <IndustrialButton
              size="lg"
              variant="secondary"
              onClick={onClose}
              className="flex-1"
            >
              Cancelar
            </IndustrialButton>
            <IndustrialButton
              size="lg"
              variant="success"
              onClick={handleSubmit}
              icon={<Check className="w-6 h-6" />}
              className="flex-1"
            >
              Registrar
            </IndustrialButton>
          </div>
        </div>
      </div>
    </div>
  );
}
