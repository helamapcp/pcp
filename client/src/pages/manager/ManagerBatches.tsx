import React from 'react';
import { useProductionBatches } from '@/hooks/useProductionData';

export default function ManagerBatches() {
  const { batches } = useProductionBatches();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Lotes de Produção</h1>
        <p className="text-muted-foreground">Registro de lotes produzidos</p>
      </div>

      <div className="bg-card border rounded-xl overflow-hidden">
        {batches.length === 0 ? (
          <div className="px-6 py-12 text-center text-muted-foreground"><p>Nenhum lote registrado.</p></div>
        ) : (
          <div className="divide-y divide-border">
            {batches.map(b => (
              <div key={b.id} className="p-4 hover:bg-secondary/50 transition-colors">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-primary font-black text-sm">{b.batch_code || b.id.slice(0, 8)}</p>
                    <p className="text-foreground font-bold text-sm mt-1">{b.final_product} • {b.machine || 'Sem misturador'}</p>
                    <p className="text-muted-foreground text-xs mt-1">{b.batches} batidas • {Number(b.total_compound_kg).toFixed(1)}kg</p>
                    <p className="text-muted-foreground text-xs">{b.produced_by_name} • {b.completed_at ? new Date(b.completed_at).toLocaleString('pt-BR') : ''}</p>
                  </div>
                  <span className={`px-2 py-1 rounded text-xs font-bold ${b.status === 'completed' ? 'bg-industrial-success/20 text-industrial-success' : 'bg-industrial-warning/20 text-industrial-warning'}`}>
                    {b.status === 'completed' ? 'Concluído' : b.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
