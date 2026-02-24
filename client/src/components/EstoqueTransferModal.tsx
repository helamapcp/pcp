import React, { useState } from 'react';
import { X, Check, ArrowRight } from 'lucide-react';
import { IndustrialButton } from './IndustrialButton';
import type { Product, Sector } from '@/contexts/EstoqueContext';

interface EstoqueTransferModalProps {
  isOpen: boolean;
  product: Product | null;
  onClose: () => void;
  onSubmit: (quantity: number, from: Sector, to: Sector) => void;
}

const SECTORS: Sector[] = ['CD', 'Fábrica', 'PMP', 'PCP'];

export function EstoqueTransferModal({
  isOpen,
  product,
  onClose,
  onSubmit,
}: EstoqueTransferModalProps) {
  const [quantity, setQuantity] = useState('');
  const [from, setFrom] = useState<Sector>('CD');
  const [to, setTo] = useState<Sector>('Fábrica');
  const [error, setError] = useState('');

  if (!isOpen || !product) return null;

  const handleKeypad = (digit: string) => {
    if (quantity.length < 8) {
      setQuantity(quantity + digit);
    }
  };

  const handleBackspace = () => {
    setQuantity(quantity.slice(0, -1));
  };

  const handleSubmit = () => {
    if (!quantity || parseInt(quantity) <= 0) {
      setError('Quantidade deve ser maior que 0');
      return;
    }

    if (from === to) {
      setError('Origem e destino devem ser diferentes');
      return;
    }

    setError('');
    onSubmit(parseInt(quantity), from, to);
    setQuantity('');
    setFrom('CD');
    setTo('Fábrica');
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-900 border-4 border-purple-500 rounded-2xl w-full max-w-md max-h-[95vh] overflow-y-auto shadow-2xl">
        {/* Header */}
        <div className="bg-slate-800 px-6 py-5 border-b-2 border-slate-700 flex justify-between items-center sticky top-0 z-10">
          <div>
            <h2 className="text-2xl font-bold text-white">🔄 Movimentação</h2>
            <p className="text-slate-300 text-sm mt-1">{product.name}</p>
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
          {/* Quantity Input */}
          <div>
            <label className="block text-white text-base font-bold mb-3">Quantidade</label>
            <div className="bg-black/50 rounded-xl p-5 mb-4 border-3 border-white/20">
              <div className="text-4xl font-bold text-white text-center font-mono">
                {quantity || '0'}
              </div>
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

          {/* Sector Selection */}
          <div>
            <label className="block text-white text-base font-bold mb-3">Rota de Transferência</label>
            
            {/* From Sector */}
            <div className="mb-4">
              <p className="text-slate-300 text-xs font-bold mb-2">DE:</p>
              <div className="grid grid-cols-2 gap-2">
                {SECTORS.map(sector => (
                  <button
                    key={sector}
                    onClick={() => setFrom(sector)}
                    className={`px-4 py-3 rounded-lg font-bold transition-all border-2 min-h-[48px] text-sm ${
                      from === sector
                        ? 'bg-blue-600 text-white border-blue-500 hover:bg-blue-700'
                        : 'bg-slate-700 text-slate-300 border-slate-600 hover:bg-slate-600'
                    }`}
                  >
                    {sector}
                  </button>
                ))}
              </div>
            </div>

            {/* Arrow */}
            <div className="flex justify-center mb-4">
              <ArrowRight className="w-6 h-6 text-purple-400" />
            </div>

            {/* To Sector */}
            <div>
              <p className="text-slate-300 text-xs font-bold mb-2">PARA:</p>
              <div className="grid grid-cols-2 gap-2">
                {SECTORS.map(sector => (
                  <button
                    key={sector}
                    onClick={() => setTo(sector)}
                    className={`px-4 py-3 rounded-lg font-bold transition-all border-2 min-h-[48px] text-sm ${
                      to === sector
                        ? 'bg-green-600 text-white border-green-500 hover:bg-green-700'
                        : 'bg-slate-700 text-slate-300 border-slate-600 hover:bg-slate-600'
                    }`}
                  >
                    {sector}
                  </button>
                ))}
              </div>
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
            <p className="text-slate-300 text-xs font-bold mb-3">RESUMO</p>
            <div className="flex items-center justify-between">
              <div className="text-center flex-1">
                <p className="text-purple-300 font-bold text-lg">{from}</p>
              </div>
              <ArrowRight className="w-5 h-5 text-purple-400 mx-2" />
              <div className="text-center flex-1">
                <p className="text-purple-300 font-bold text-lg">{to}</p>
              </div>
            </div>
            <p className="text-white font-bold text-2xl text-center mt-3">
              {quantity ? `${quantity} sacos` : '-'}
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
              Confirmar
            </IndustrialButton>
          </div>
        </div>
      </div>
    </div>
  );
}
