import React from 'react';
import { useStockMovements } from '@/hooks/useIndustrialData';

const movementTypeColor = (t: string) => {
  if (t === 'entry' || t === 'transfer_in' || t === 'production_in' || t === 'factory_in') return 'bg-industrial-success/20 text-industrial-success';
  if (t === 'transfer_out' || t === 'production_out' || t === 'factory_out') return 'bg-destructive/20 text-destructive';
  return 'bg-secondary text-secondary-foreground';
};

export default function ManagerAudit() {
  const { movements } = useStockMovements();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Auditoria</h1>
        <p className="text-muted-foreground">Trilha completa de ações e movimentações do sistema</p>
      </div>

      <div className="bg-card border rounded-xl overflow-hidden">
        <div className="divide-y divide-border max-h-[600px] overflow-y-auto">
          {movements.map(m => (
            <div key={m.id} className="px-4 py-3 hover:bg-secondary/50 transition-colors">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p className="text-foreground text-sm font-semibold truncate">{m.notes || m.movement_type}</p>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-primary text-xs font-bold">👤 {m.user_name}</span>
                    <span className="text-muted-foreground text-xs">{new Date(m.created_at).toLocaleString('pt-BR')}</span>
                  </div>
                </div>
                <span className={`px-2 py-1 rounded text-xs font-bold whitespace-nowrap ${movementTypeColor(m.movement_type)}`}>
                  {m.location_code} • {Number(m.total_kg).toFixed(1)}kg
                </span>
              </div>
            </div>
          ))}
          {movements.length === 0 && <div className="px-6 py-12 text-center text-muted-foreground"><p>Nenhuma ação registrada.</p></div>}
        </div>
      </div>
    </div>
  );
}
