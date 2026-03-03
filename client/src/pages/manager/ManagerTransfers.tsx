import React from 'react';
import { useTransfers } from '@/hooks/useIndustrialData';

export default function ManagerTransfers() {
  const { transfers } = useTransfers();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Transferências</h1>
        <p className="text-muted-foreground">Acompanhamento de transferências entre locais</p>
      </div>

      <div className="space-y-4">
        {transfers.length === 0 ? (
          <div className="bg-card border rounded-xl px-6 py-12 text-center text-muted-foreground"><p>Nenhuma transferência registrada.</p></div>
        ) : transfers.slice(0, 50).map(t => (
          <div key={t.id} className={`bg-card border ${t.status === 'pending' ? 'border-industrial-warning' : 'border-border'} rounded-xl p-6`}>
            <div className="flex justify-between items-center">
              <div>
                <p className="text-foreground font-bold">{t.from_location} → {t.to_location}</p>
                <p className="text-muted-foreground text-xs">{t.requested_by_name} • {new Date(t.created_at).toLocaleString('pt-BR')}</p>
                {t.notes && <p className="text-muted-foreground text-xs mt-1 truncate max-w-[400px]">{t.notes}</p>}
              </div>
              <span className={`px-2 py-1 rounded text-xs font-bold ${t.status === 'pending' ? 'bg-industrial-warning/20 text-industrial-warning' : t.status === 'completed' ? 'bg-industrial-success/20 text-industrial-success' : 'bg-secondary text-secondary-foreground'}`}>
                {t.status === 'pending' ? 'Pendente' : t.status === 'completed' ? 'Concluída' : t.status}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
