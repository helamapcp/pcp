import React, { useState, useMemo } from 'react';
import { useLocation } from 'wouter';
import { useAuth } from '@/contexts/AuthContext';
import { useIndustrialProducts, useStock } from '@/hooks/useIndustrialData';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { ArrowLeft, Scale, CheckCircle2, Loader2, AlertTriangle } from 'lucide-react';

const LOCATIONS = ['CD', 'PCP', 'PMP', 'FABRICA'] as const;

export default function AdminStockAdjustment() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const { products } = useIndustrialProducts();
  const { stock, getStock, refetch: refetchStock } = useStock();

  const [selectedProduct, setSelectedProduct] = useState('');
  const [selectedLocation, setSelectedLocation] = useState('');
  const [newTotalKg, setNewTotalKg] = useState('');
  const [newQuantity, setNewQuantity] = useState('');
  const [justification, setJustification] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [result, setResult] = useState<{ old_kg: number; new_kg: number; difference_kg: number } | null>(null);
  const [search, setSearch] = useState('');

  const filteredProducts = useMemo(() => {
    if (!search) return products;
    const q = search.toLowerCase();
    return products.filter(p => p.name.toLowerCase().includes(q) || p.category.toLowerCase().includes(q));
  }, [products, search]);

  const product = products.find(p => p.id === selectedProduct);
  const currentStock = product && selectedLocation ? getStock(product.id, selectedLocation) : undefined;
  const currentKg = Number(currentStock?.total_kg || 0);
  const parsedNewKg = parseFloat(newTotalKg);
  const diff = !isNaN(parsedNewKg) ? parsedNewKg - currentKg : 0;

  const canSubmit = selectedProduct && selectedLocation && !isNaN(parsedNewKg) && parsedNewKg >= 0 && justification.trim().length > 0;

  const handleConfirm = async () => {
    if (!user || !canSubmit) return;
    setSubmitting(true);
    try {
      const { data, error } = await supabase.rpc('admin_stock_adjustment', {
        p_product_id: selectedProduct,
        p_location_code: selectedLocation,
        p_new_quantity: parseFloat(newQuantity) || parsedNewKg,
        p_new_total_kg: parsedNewKg,
        p_justification: justification.trim(),
        p_user_id: user.id,
        p_user_name: user.fullName,
      });
      if (error) throw error;
      setResult(data as any);
      await refetchStock();
      toast.success('Ajuste aplicado com sucesso!');
      setDone(true);
    } catch (err: any) {
      toast.error('Erro: ' + (err.message || err));
    } finally {
      setSubmitting(false);
    }
  };

  if (!user || user.role !== 'admin') {
    setLocation('/admin');
    return null;
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="bg-card border-b-2 border-border sticky top-0 z-10 p-4">
        <div className="flex items-center gap-3">
          <button onClick={() => setLocation('/admin')} className="p-2 bg-secondary hover:bg-secondary/80 rounded-lg transition-colors touch-target">
            <ArrowLeft className="w-5 h-5 text-foreground" />
          </button>
          <div>
            <h1 className="text-xl font-black text-foreground flex items-center gap-2">
              <Scale className="w-5 h-5 text-destructive" /> Ajuste Manual de Estoque
            </h1>
            <p className="text-muted-foreground text-xs">Admin • Correção direta com auditoria</p>
          </div>
        </div>
      </div>

      <div className="flex-1 p-4 max-w-2xl mx-auto w-full">
        {!done ? (
          <div className="space-y-4">
            <div className="bg-destructive/10 border-2 border-destructive/30 rounded-lg p-3">
              <p className="text-destructive font-bold text-sm flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" />
                Este ajuste substitui o valor atual do estoque. Justificativa obrigatória.
              </p>
            </div>

            <div className="bg-card border-2 border-border rounded-lg p-4 space-y-4">
              <div className="space-y-2">
                <label className="text-foreground font-bold text-sm">Buscar Produto</label>
                <input type="text" value={search} onChange={e => setSearch(e.target.value)}
                  placeholder="🔍 Buscar..."
                  className="w-full bg-input border-2 border-border rounded-lg p-3 text-foreground placeholder-muted-foreground" />
              </div>

              <div className="space-y-2">
                <label className="text-foreground font-bold text-sm">Produto</label>
                <select value={selectedProduct} onChange={e => setSelectedProduct(e.target.value)}
                  className="w-full bg-input border-2 border-border rounded-lg p-3 text-foreground font-semibold touch-target">
                  <option value="">Selecione...</option>
                  {filteredProducts.map(p => (
                    <option key={p.id} value={p.id}>{p.name} ({p.category})</option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-foreground font-bold text-sm">Local</label>
                <select value={selectedLocation} onChange={e => setSelectedLocation(e.target.value)}
                  className="w-full bg-input border-2 border-border rounded-lg p-3 text-foreground font-semibold touch-target">
                  <option value="">Selecione...</option>
                  {LOCATIONS.map(loc => <option key={loc} value={loc}>{loc}</option>)}
                </select>
              </div>

              {selectedProduct && selectedLocation && (
                <div className="bg-secondary rounded-lg p-3 border border-border">
                  <p className="text-muted-foreground text-xs font-bold">ESTOQUE ATUAL</p>
                  <p className="text-foreground text-2xl font-black">{currentKg.toFixed(2)} kg</p>
                  <p className="text-muted-foreground text-xs">Qtd: {Number(currentStock?.quantity || 0)}</p>
                </div>
              )}

              <div className="space-y-2">
                <label className="text-foreground font-bold text-sm">Novo Total (kg)</label>
                <input type="text" inputMode="decimal" value={newTotalKg}
                  onChange={e => setNewTotalKg(e.target.value)}
                  placeholder="0.00"
                  className="w-full bg-input border-2 border-border rounded-lg p-3 text-foreground font-bold text-2xl text-center touch-target" />
                {!isNaN(parsedNewKg) && selectedProduct && selectedLocation && (
                  <p className={`text-sm font-bold text-center ${diff > 0 ? 'text-industrial-success' : diff < 0 ? 'text-destructive' : 'text-muted-foreground'}`}>
                    Diferença: {diff > 0 ? '+' : ''}{diff.toFixed(2)} kg
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-foreground font-bold text-sm">Quantidade (opcional)</label>
                <input type="text" inputMode="decimal" value={newQuantity}
                  onChange={e => setNewQuantity(e.target.value)}
                  placeholder="Unidades"
                  className="w-full bg-input border-2 border-border rounded-lg p-3 text-foreground font-semibold touch-target" />
              </div>

              <div className="space-y-2">
                <label className="text-foreground font-bold text-sm flex items-center gap-1">
                  <AlertTriangle className="w-4 h-4 text-destructive" /> Justificativa (obrigatória)
                </label>
                <input type="text" value={justification}
                  onChange={e => setJustification(e.target.value)}
                  placeholder="Ex: Correção de estoque legado, erro de contagem..."
                  className={`w-full bg-input border-2 rounded-lg p-3 text-foreground font-semibold touch-target ${
                    !justification.trim() ? 'border-destructive' : 'border-border'
                  }`} />
              </div>
            </div>

            <button onClick={handleConfirm} disabled={submitting || !canSubmit}
              className="w-full bg-destructive hover:bg-destructive/90 text-destructive-foreground font-black text-lg py-4 rounded-xl transition-colors touch-target disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
              {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Scale className="w-5 h-5" />}
              {submitting ? 'APLICANDO...' : 'APLICAR AJUSTE'}
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="bg-card border-2 border-industrial-success rounded-lg p-6 text-center">
              <CheckCircle2 className="w-16 h-16 text-industrial-success mx-auto mb-4" />
              <h2 className="text-foreground font-black text-2xl mb-2">Ajuste Aplicado!</h2>
              {result && (
                <div className="space-y-2">
                  <p className="text-muted-foreground">
                    {product?.name} em {selectedLocation}
                  </p>
                  <div className="bg-secondary rounded-lg p-3 inline-block">
                    <p className="text-muted-foreground text-xs">Anterior → Novo</p>
                    <p className="text-foreground font-black text-lg">
                      {Number(result.old_kg).toFixed(2)} → {Number(result.new_kg).toFixed(2)} kg
                    </p>
                    <p className={`text-sm font-bold ${Number(result.difference_kg) > 0 ? 'text-industrial-success' : 'text-destructive'}`}>
                      {Number(result.difference_kg) > 0 ? '+' : ''}{Number(result.difference_kg).toFixed(2)} kg
                    </p>
                  </div>
                </div>
              )}
              <p className="text-muted-foreground text-xs mt-2">
                ✅ Registrado em stock_adjustments e stock_movements
              </p>
            </div>

            <div className="flex gap-3">
              <button onClick={() => {
                setDone(false); setResult(null);
                setSelectedProduct(''); setSelectedLocation('');
                setNewTotalKg(''); setNewQuantity(''); setJustification('');
              }}
                className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground font-bold py-4 rounded-xl transition-colors touch-target">
                NOVO AJUSTE
              </button>
              <button onClick={() => setLocation('/admin')}
                className="flex-1 bg-secondary hover:bg-secondary/80 text-secondary-foreground font-bold py-4 rounded-xl transition-colors touch-target">
                VOLTAR AO ADMIN
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
