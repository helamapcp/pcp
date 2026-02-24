import React, { useState } from 'react';
import { X, Check } from 'lucide-react';
import { IndustrialButton } from './IndustrialButton';
import { toast } from 'sonner';

interface BatchEntryModalProps {
  isOpen: boolean;
  productName: string;
  standardBagWeight: number;
  onClose: () => void;
  onSubmit: (batchNumber: string, weight: number) => void;
}

export function BatchEntryModal({
  isOpen,
  productName,
  standardBagWeight,
  onClose,
  onSubmit,
}: BatchEntryModalProps) {
  const [batchNumber, setBatchNumber] = useState('');
  const [customWeight, setCustomWeight] = useState('');
  const [useCustom, setUseCustom] = useState(false);
  const [error, setError] = useState('');

  const handleBatchInput = (digit: string) => {
    if (batchNumber.length < 8) {
      setBatchNumber(batchNumber + digit);
    }
  };

  const handleBatchBackspace = () => {
    setBatchNumber(batchNumber.slice(0, -1));
  };

  const handleCustomWeightChange = (value: string) => {
    const numValue = value.replace(/\D/g, '');
    setCustomWeight(numValue);
  };

  const handleSubmit = () => {
    if (!batchNumber.trim()) {
      setError('Número do lote é obrigatório');
      return;
    }

    const weight = useCustom ? parseInt(customWeight) : standardBagWeight;

    if (useCustom && (!customWeight || weight <= 0)) {
      setError('Peso deve ser maior que 0');
      return;
    }

    setError('');
    onSubmit(batchNumber, weight);
    setBatchNumber('');
    setCustomWeight('');
    setUseCustom(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-800 border-4 border-yellow-400 rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="bg-slate-900 px-6 py-4 border-b border-slate-700 flex justify-between items-center sticky top-0">
          <div>
            <h2 className="text-xl font-bold text-white">Registrar Lote</h2>
            <p className="text-slate-300 text-sm">{productName}</p>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-slate-700 rounded transition-colors"
          >
            <X className="w-6 h-6 text-white" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Batch Number Input */}
          <div>
            <label className="block text-white text-sm font-bold mb-3">Número do Lote</label>
            <div className="bg-black/30 rounded-lg p-4 mb-3 border-2 border-white/20">
              <div className="text-3xl font-bold text-white text-center font-mono">
                {batchNumber || '________'}
              </div>
            </div>

            {/* Numeric Keypad */}
            <div className="grid grid-cols-3 gap-2 mb-3">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
                <button
                  key={num}
                  onClick={() => handleBatchInput(num.toString())}
                  className="p-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg transition-colors text-lg"
                >
                  {num}
                </button>
              ))}
              <button
                onClick={() => handleBatchInput('0')}
                className="col-span-2 p-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg transition-colors text-lg"
              >
                0
              </button>
              <button
                onClick={handleBatchBackspace}
                className="p-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg transition-colors"
              >
                ←
              </button>
            </div>
          </div>

          {/* Weight Selection */}
          <div>
            <label className="block text-white text-sm font-bold mb-3">Peso</label>

            {/* Standard Bag Button */}
            <button
              onClick={() => setUseCustom(false)}
              className={`w-full px-4 py-4 rounded-lg font-bold text-lg transition-all mb-3 border-2 ${
                !useCustom
                  ? 'bg-green-600 text-white border-green-500'
                  : 'bg-slate-700 text-slate-300 border-slate-600 hover:bg-slate-600'
              }`}
            >
              📦 1 Saco ({standardBagWeight}kg)
            </button>

            {/* Custom Weight Option */}
            <div className="space-y-2">
              <button
                onClick={() => setUseCustom(true)}
                className={`w-full px-4 py-3 rounded-lg font-bold transition-all border-2 ${
                  useCustom
                    ? 'bg-blue-600 text-white border-blue-500'
                    : 'bg-slate-700 text-slate-300 border-slate-600 hover:bg-slate-600'
                }`}
              >
                ⚙️ Peso Customizado
              </button>

              {useCustom && (
                <div className="bg-slate-700/50 rounded-lg p-3 border border-slate-600">
                  <input
                    type="text"
                    value={customWeight}
                    onChange={e => handleCustomWeightChange(e.target.value)}
                    placeholder="Digite o peso em kg"
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded text-white text-lg font-bold text-center focus:outline-none focus:border-blue-400"
                  />
                  <p className="text-xs text-slate-400 mt-2">Ex: 2500 para 2 sacos</p>
                </div>
              )}
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-900/30 border border-red-500 rounded-lg p-3">
              <p className="text-red-300 text-sm">{error}</p>
            </div>
          )}

          {/* Summary */}
          <div className="bg-slate-700/50 rounded-lg p-4 border border-slate-600">
            <p className="text-slate-300 text-xs mb-1">RESUMO</p>
            <p className="text-white font-bold text-lg">
              {useCustom ? customWeight : standardBagWeight}kg
            </p>
            <p className="text-slate-400 text-xs mt-1">
              ≈ {Math.round((useCustom ? parseInt(customWeight) : standardBagWeight) / standardBagWeight)} saco(s)
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
              icon={<Check className="w-5 h-5" />}
              className="flex-1"
            >
              Adicionar
            </IndustrialButton>
          </div>
        </div>
      </div>
    </div>
  );
}
