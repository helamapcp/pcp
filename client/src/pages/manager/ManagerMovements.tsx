import React from 'react';
import { useStockMovements } from '@/hooks/useIndustrialData';

const movementTypeLabel = (t: string) => {
  const map: Record<string, string> = { entry: 'Entrada', transfer_out: 'Saída', transfer_in: 'Recebimento', production_out: 'Prod. Saída', production_in: 'Prod. Entrada', factory_out: 'Envio Fábrica', factory_in: 'Receb. Fábrica' };
  return map[t] || t;
};

const movementTypeColor = (t: string) => {
  if (t === 'entry' || t === 'transfer_in' || t === 'production_in' || t === 'factory_in') return 'bg-industrial-success/20 text-industrial-success';
  if (t === 'transfer_out' || t === 'production_out' || t === 'factory_out') return 'bg-destructive/20 text-destructive';
  return 'bg-secondary text-secondary-foreground';
};

export default function ManagerMovements() {
  const { movements } = useStockMovements();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Movimentações</h1>
        <p className="text-muted-foreground">Histórico completo de movimentações de estoque</p>
      </div>

      <div className="bg-card border rounded-xl overflow-hidden">
        {movements.length === 0 ? (
          <div className="px-6 py-12 text-center text-muted-foreground"><p>Nenhuma movimentação registrada.</p></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-secondary border-b border-border">
                <tr>
                  <th className="px-4 py-3 text-left text-foreground font-bold">Data/Hora</th>
                  <th className="px-4 py-3 text-left text-foreground font-bold">Tipo</th>
                  <th className="px-4 py-3 text-left text-foreground font-bold">Local</th>
                  <th className="px-4 py-3 text-right text-foreground font-bold">Qtd (kg)</th>
                  <th className="px-4 py-3 text-left text-foreground font-bold">Notas</th>
                  <th className="px-4 py-3 text-left text-foreground font-bold">Responsável</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {movements.slice(0, 100).map(m => (
                  <tr key={m.id} className="hover:bg-secondary/50 transition-colors">
                    <td className="px-4 py-3 text-muted-foreground text-xs">{new Date(m.created_at).toLocaleString('pt-BR')}</td>
                    <td className="px-4 py-3"><span className={`px-2 py-1 rounded text-xs font-bold ${movementTypeColor(m.movement_type)}`}>{movementTypeLabel(m.movement_type)}</span></td>
                    <td className="px-4 py-3 text-foreground font-bold text-sm">{m.location_code}</td>
                    <td className="px-4 py-3 text-right text-foreground font-bold">{Number(m.total_kg).toFixed(1)}</td>
                    <td className="px-4 py-3 text-muted-foreground text-xs truncate max-w-[200px]">{m.notes}</td>
                    <td className="px-4 py-3 text-foreground text-sm">{m.user_name}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
