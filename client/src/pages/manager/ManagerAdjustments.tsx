import React from 'react';
import { useIndustrialProducts } from '@/hooks/useIndustrialData';
import { useStockAdjustments } from '@/hooks/useInventoryCounting';

export default function ManagerAdjustments() {
  const { products } = useIndustrialProducts();
  const { adjustments } = useStockAdjustments();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Ajustes de Estoque</h1>
        <p className="text-muted-foreground">Histórico de ajustes manuais e de inventário</p>
      </div>

      <div className="bg-card border rounded-xl overflow-hidden">
        {adjustments.length === 0 ? (
          <div className="px-6 py-12 text-center text-muted-foreground"><p>Nenhum ajuste registrado.</p></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-secondary border-b border-border">
                <tr>
                  <th className="px-4 py-3 text-left text-foreground font-bold">Data</th>
                  <th className="px-4 py-3 text-left text-foreground font-bold">Produto / Local</th>
                  <th className="px-4 py-3 text-right text-foreground font-bold">Anterior</th>
                  <th className="px-4 py-3 text-right text-foreground font-bold">Novo</th>
                  <th className="px-4 py-3 text-right text-foreground font-bold">Diferença</th>
                  <th className="px-4 py-3 text-left text-foreground font-bold">Motivo</th>
                  <th className="px-4 py-3 text-left text-foreground font-bold">Responsável</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {adjustments.slice(0, 100).map(a => {
                  const product = products.find(p => p.id === a.product_id);
                  return (
                    <tr key={a.id} className="hover:bg-secondary/50 transition-colors">
                      <td className="px-4 py-3 text-muted-foreground text-xs">{new Date(a.created_at).toLocaleString('pt-BR')}</td>
                      <td className="px-4 py-3 text-foreground font-bold text-sm">{product?.name || '—'} <span className="text-muted-foreground font-normal">({a.location_code})</span></td>
                      <td className="px-4 py-3 text-right text-foreground">{Number(a.old_total_kg).toFixed(2)}</td>
                      <td className="px-4 py-3 text-right text-foreground font-bold">{Number(a.new_total_kg).toFixed(2)}</td>
                      <td className={`px-4 py-3 text-right font-bold ${Number(a.difference_kg) > 0 ? 'text-industrial-success' : 'text-destructive'}`}>
                        {Number(a.difference_kg) > 0 ? '+' : ''}{Number(a.difference_kg).toFixed(2)}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground text-xs truncate max-w-[200px]">{a.reason || '—'}</td>
                      <td className="px-4 py-3 text-foreground text-sm">{a.user_name}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
