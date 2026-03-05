import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { usePurchaseSuggestions } from '@/hooks/usePlanningData';
import { useIndustrialProducts } from '@/hooks/useIndustrialData';
import { IndustrialButton } from '@/components/IndustrialButton';
import { toast } from 'sonner';
import { Check, ShoppingCart } from 'lucide-react';

export default function ManagerPurchases() {
  const { user } = useAuth();
  const { products } = useIndustrialProducts();
  const { suggestions, resolveSuggestion } = usePurchaseSuggestions();

  const openSuggestions = suggestions.filter(s => s.status === 'open');
  const resolvedSuggestions = suggestions.filter(s => s.status === 'resolved');

  const handleResolve = async (id: string) => {
    if (!user) return;
    const { error } = await resolveSuggestion(id, user.id, user.fullName);
    if (error) toast.error('Erro ao resolver');
    else toast.success('Sugestão marcada como resolvida');
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Sugestões de Compra</h1>
        <p className="text-muted-foreground">Materiais com estoque insuficiente para produção planejada</p>
      </div>

      {openSuggestions.length === 0 && resolvedSuggestions.length === 0 && (
        <div className="bg-card border rounded-xl px-6 py-12 text-center text-muted-foreground">
          <ShoppingCart className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p>Nenhuma sugestão de compra.</p>
        </div>
      )}

      {openSuggestions.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-foreground font-bold text-lg">Pendentes ({openSuggestions.length})</h2>
          {openSuggestions.map(s => {
            const product = products.find(p => p.id === s.product_id);
            return (
              <div key={s.id} className="bg-card border-2 border-destructive/30 rounded-xl p-4">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-foreground font-bold">{product?.name || 'Produto'}</p>
                    <p className="text-muted-foreground text-xs">
                      Necessário: {Number(s.required_quantity_kg).toFixed(1)} kg •
                      Disponível: {Number(s.available_stock_kg).toFixed(1)} kg
                    </p>
                    <p className="text-muted-foreground text-xs">
                      {new Date(s.created_at).toLocaleString('pt-BR')}
                    </p>
                  </div>
                  <div className="text-right space-y-2">
                    <p className="text-destructive font-black text-lg">{Number(s.suggested_purchase_kg).toFixed(1)} kg</p>
                    <IndustrialButton size="sm" variant="success" onClick={() => handleResolve(s.id)}
                      icon={<Check className="w-3 h-3" />}>
                      Resolver
                    </IndustrialButton>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {resolvedSuggestions.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-foreground font-bold text-lg">Resolvidas</h2>
          {resolvedSuggestions.slice(0, 20).map(s => {
            const product = products.find(p => p.id === s.product_id);
            return (
              <div key={s.id} className="bg-card border rounded-xl p-4 opacity-60">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-foreground font-bold text-sm">{product?.name || 'Produto'}</p>
                    <p className="text-muted-foreground text-xs">{Number(s.suggested_purchase_kg).toFixed(1)} kg</p>
                  </div>
                  <span className="px-2 py-1 rounded text-xs font-bold bg-industrial-success/20 text-industrial-success">Resolvida</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
