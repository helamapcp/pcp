import React from 'react';
import { Check, X } from 'lucide-react';
import { IndustrialButton } from './IndustrialButton';
import { toast } from 'sonner';
import type { Separation } from '@/contexts/EstoqueContext';

interface SeparationChecklistProps {
  separations: Separation[];
  onCompleteSeparation: (separationId: string, operator: string) => void;
}

export function SeparationChecklist({
  separations,
  onCompleteSeparation,
}: SeparationChecklistProps) {
  const handleComplete = (separation: Separation) => {
    onCompleteSeparation(separation.id, 'Operador');
    toast.success(
      `✓ Separação Confirmada\n${separation.productName}\n${separation.from} → ${separation.to}\n${separation.quantity} sacos`,
      { duration: 3000 }
    );
  };

  if (separations.length === 0) {
    return (
      <div className="bg-slate-700/50 border-2 border-slate-600 rounded-lg p-12 text-center">
        <p className="text-slate-400 text-lg">✓ Nenhuma separação pendente</p>
        <p className="text-slate-500 text-sm mt-2">Todas as transferências foram confirmadas!</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {separations.map((separation) => (
        <div
          key={separation.id}
          className="bg-slate-700/50 border-3 border-yellow-500 rounded-lg p-5 hover:bg-slate-700/70 transition-colors"
        >
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <p className="text-white font-bold text-lg">{separation.productName}</p>
              <p className="text-slate-300 text-sm mt-1">
                {separation.from} <span className="text-yellow-400">→</span> {separation.to}
              </p>
            </div>
            <div className="text-right">
              <p className="text-white font-black text-2xl">{separation.quantity}</p>
              <p className="text-slate-400 text-xs">sacos</p>
            </div>
          </div>

          <div className="bg-slate-800/50 rounded-lg p-3 mb-4">
            <p className="text-slate-300 text-xs font-bold mb-2">INSTRUÇÕES:</p>
            <p className="text-slate-300 text-sm">
              Localize e prepare {separation.quantity} saco(s) de <span className="font-bold">{separation.productName}</span> para transferência de <span className="font-bold">{separation.from}</span> para <span className="font-bold">{separation.to}</span>.
            </p>
          </div>

          <div className="flex gap-3">
            <IndustrialButton
              size="lg"
              variant="secondary"
              className="flex-1"
              disabled
            >
              Aguardando...
            </IndustrialButton>
            <IndustrialButton
              size="lg"
              variant="success"
              onClick={() => handleComplete(separation)}
              icon={<Check className="w-6 h-6" />}
              className="flex-1"
            >
              Confirmar
            </IndustrialButton>
          </div>
        </div>
      ))}
    </div>
  );
}
