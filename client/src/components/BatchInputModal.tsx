import React, { useState } from 'react';
import { X, Check } from 'lucide-react';
import { IndustrialButton } from './IndustrialButton';
import { toast } from 'sonner';
import type { Product } from '@/contexts/PVCInventoryContext';

interface BatchInputModalProps {
  isOpen: boolean;
  product: Product | null;
  action: 'add' | 'consume';
  onClose: () => void;
  onSubmit: (batchNumber: string, weight: number) => void;
}

export function BatchInputModal({
  isOpen,
  product,
  action,
  onClose,
  onSubmit,
}: BatchInputModalProps) {
  const [batchNumber, setBatchNumber] = useState('');
  const [customWeight, setCustomWeight] = useState('');
  const [useCustomWeight, setUseCustomWeight] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen || !product) return null;

  const isResina = product.category === 'Resinas' || product.category === 'Cargas' || product.category === 'Capstock';
  const defaultWeight = product.standardBagWeight;

  const handleBatchKeypad = (digit: string) => {
    if (batchNumber.length < 10) {
      setBatchNumber(batchNumber + digit);
    }
  };

  const handleBatchBackspace = () => {
    setBatchNumber(batchNumber.slice(0, -1));
  };

  const handleCustomWeightKeypad = (digit: string) => {
    if (customWeight.length < 6) {
      setCustomWeight(customWeight + digit);
    }
  };

  const handleCustomWeightBackspace = () => {
    setCustomWeight(customWeight.slice(0, -1));
  };

  const handleSubmit = () => {
    if (!batchNumber.trim()) {
      setError('Número do lote é obrigatório');
      return;
    }

    const weight = useCustomWeight ? parseInt(customWeight) : defaultWeight;

    if (useCustomWeight && (!customWeight || weight <= 0)) {
      setError('Peso deve ser maior que 0');
      return;
    }

    setError('');
    onSubmit(batchNumber, weight);
    setBatchNumber('');
    setCustomWeight('');
    setUseCustomWeight(false);
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-900 border-4 border-yellow-500 rounded-2xl w-full max-w-md max-h-[95vh] overflow-y-auto shadow-2xl">
        {/* Header */}
        <div className="bg-slate-800 px-6 py-5 border-b-2 border-slate-700 flex justify-between items-center sticky top-0 z-10">
          <div>
            <h2 className="text-2xl font-bold text-white">{action === 'add' ? '➕ Adicionar' : '➖ Consumir'}</h2>
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
          {/* Batch Number Section */}
          <div>
            <label className="block text-white text-base font-bold mb-3">Número do Lote</label>
            <div className="bg-black/50 rounded-xl p-5 mb-4 border-3 border-white/20">
              <div className="text-4xl font-bold text-white text-center font-mono tracking-wider">
                {batchNumber || '_ _ _ _ _ _'}
              </div>
            </div>

            {/* Numeric Keypad for Batch */}
            <div className="grid grid-cols-3 gap-2 mb-4">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
                <button
                  key={num}
                  onClick={() => handleBatchKeypad(num.toString())}
                  className="p-4 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-bold rounded-lg transition-colors text-xl min-h-[56px]"
                >
                  {num}
                </button>
              ))}
              <button
                onClick={() => handleBatchKeypad('0')}
                className="col-span-2 p-4 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-bold rounded-lg transition-colors text-xl min-h-[56px]"
              >
                0
              </button>
              <button
                onClick={handleBatchBackspace}
                className="p-4 bg-red-600 hover:bg-red-700 active:bg-red-800 text-white font-bold rounded-lg transition-colors text-xl min-h-[56px]"
              >
                ← DEL
              </button>
            </div>
          </div>

          {/* Weight Section */}
          <div>
            <label className="block text-white text-base font-bold mb-3">Peso</label>

            {/* Default Weight Button */}
            <button
              onClick={() => setUseCustomWeight(false)}
              className={`w-full px-6 py-5 rounded-xl font-bold text-lg transition-all mb-3 border-3 min-h-[64px] ${
                !useCustomWeight
                  ? 'bg-green-600 text-white border-green-500 hover:bg-green-700'
                  : 'bg-slate-700 text-slate-300 border-slate-600 hover:bg-slate-600'
              }`}
            >
              📦 1 Saco ({defaultWeight}kg)
            </button>

            {/* Custom Weight Option */}
            {!isResina && (
              <>
                <button
                  onClick={() => setUseCustomWeight(true)}
                  className={`w-full px-6 py-4 rounded-xl font-bold text-lg transition-all border-3 min-h-[56px] ${
                    useCustomWeight
                      ? 'bg-blue-600 text-white border-blue-500 hover:bg-blue-700'
                      : 'bg-slate-700 text-slate-300 border-slate-600 hover:bg-slate-600'
                  }`}
                >
                  ⚙️ Peso Customizado
                </button>

                {useCustomWeight && (
                  <div className="mt-4 space-y-3">
                    <div className="bg-black/50 rounded-xl p-5 border-3 border-white/20">
                      <div className="text-3xl font-bold text-white text-center font-mono">
                        {customWeight || '0'} kg
                      </div>
                    </div>

                    {/* Numeric Keypad for Weight */}
                    <div className="grid grid-cols-3 gap-2">
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
                        <button
                          key={num}
                          onClick={() => handleCustomWeightKeypad(num.toString())}
                          className="p-3 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-bold rounded-lg transition-colors text-lg min-h-[48px]"
                        >
                          {num}
                        </button>
                      ))}
                      <button
                        onClick={() => handleCustomWeightKeypad('0')}
                        className="col-span-2 p-3 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-bold rounded-lg transition-colors text-lg min-h-[48px]"
                      >
                        0
                      </button>
                      <button
                        onClick={handleCustomWeightBackspace}
                        className="p-3 bg-red-600 hover:bg-red-700 active:bg-red-800 text-white font-bold rounded-lg transition-colors text-lg min-h-[48px]"
                      >
                        ← DEL
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
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
              {useCustomWeight ? customWeight : defaultWeight}kg
            </p>
            <p className="text-slate-400 text-xs mt-2">
              ≈ {Math.round((useCustomWeight ? parseInt(customWeight) : defaultWeight) / product.standardBagWeight)} saco(s)
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
