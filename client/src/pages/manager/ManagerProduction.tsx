import React from 'react';
import { useProductionOrders } from '@/hooks/useProductionData';

export default function ManagerProduction() {
  const { orders: productionOrders } = useProductionOrders();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Produção</h1>
        <p className="text-muted-foreground">Ordens de produção confirmadas e pendentes</p>
      </div>

      <div className="space-y-4">
        {productionOrders.length === 0 ? (
          <div className="bg-card border rounded-xl px-6 py-12 text-center text-muted-foreground"><p>Nenhuma ordem de produção registrada.</p></div>
        ) : productionOrders.map(po => (
          <div key={po.id} className={`bg-card border ${po.status === 'confirmed' ? 'border-industrial-success' : 'border-border'} rounded-xl p-6`}>
            <div className="flex justify-between items-center">
              <div>
                <p className="text-foreground font-bold">{po.final_product} • {po.machine || 'Sem misturador'}</p>
                <p className="text-muted-foreground text-xs">{po.batches} batidas × {po.weight_per_batch}kg = {Number(po.total_compound_kg).toFixed(1)}kg</p>
                <p className="text-muted-foreground text-xs mt-1">{po.created_by_name} • {new Date(po.created_at).toLocaleString('pt-BR')}</p>
              </div>
              <span className={`px-2 py-1 rounded text-xs font-bold ${po.status === 'confirmed' ? 'bg-industrial-success/20 text-industrial-success' : 'bg-industrial-warning/20 text-industrial-warning'}`}>
                {po.status === 'confirmed' ? 'Confirmada' : po.status}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
