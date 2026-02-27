import React, { useState, useMemo } from 'react';
import { useLocation } from 'wouter';
import { useAuth } from '@/contexts/AuthContext';
import { useIndustrialProducts, useStock } from '@/hooks/useIndustrialData';
import { useInventoryCounts, type InventoryCountItem } from '@/hooks/useInventoryCounting';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { ArrowLeft, ClipboardList, CheckCircle2, AlertTriangle, Loader2, Search } from 'lucide-react';

type Step = 'select' | 'count' | 'done';

interface CountRow {
  id: string;
  product_id: string;
  product_name: string;
  category: string;
  system_quantity: number;
  system_total_kg: number;
  counted_total_kg: string;
  difference_kg: number;
  justification: string;
}

const COUNTABLE_LOCATIONS = ['CD', 'PCP', 'PMP', 'FABRICA'];

export default function InventoryCountPage() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const { products } = useIndustrialProducts();
  const { stock, refetch: refetchStock } = useStock();
  const { counts, createCount, confirmCount, refetch: refetchCounts } = useInventoryCounts();

  const [step, setStep] = useState<Step>('select');
  const [selectedLocation, setSelectedLocation] = useState('');
  const [rows, setRows] = useState<CountRow[]>([]);
  const [countId, setCountId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [search, setSearch] = useState('');

  const handleStartCount = async () => {
    if (!selectedLocation || !user) return;
    setSubmitting(true);

    // Get all products that have stock at this location
    const locationStock = stock.filter(s => s.location_code === selectedLocation);
    
    // Also include products with 0 stock for completeness
    const productIds = new Set(locationStock.map(s => s.product_id));
    
    const items = locationStock.map(s => ({
      product_id: s.product_id,
      system_quantity: Number(s.quantity),
      system_total_kg: Number(s.total_kg),
    }));

    if (items.length === 0) {
      toast.error('Nenhum produto com estoque neste local');
      setSubmitting(false);
      return;
    }

    const { data, error } = await createCount(selectedLocation, user.id, user.fullName, items);
    if (error || !data) {
      toast.error('Erro ao criar contagem');
      setSubmitting(false);
      return;
    }

    // Fetch created items
    const { data: countItems } = await supabase
      .from('inventory_count_items')
      .select('*')
      .eq('inventory_count_id', data.id);

    const countRows: CountRow[] = (countItems || []).map((ci: any) => {
      const product = products.find(p => p.id === ci.product_id);
      return {
        id: ci.id,
        product_id: ci.product_id,
        product_name: product?.name || 'Desconhecido',
        category: product?.category || '',
        system_quantity: Number(ci.system_quantity),
        system_total_kg: Number(ci.system_total_kg),
        counted_total_kg: '',
        difference_kg: 0,
        justification: '',
      };
    });

    setRows(countRows);
    setCountId(data.id);
    setStep('count');
    setSubmitting(false);
  };

  const updateRow = (idx: number, field: keyof CountRow, value: string) => {
    setRows(prev => {
      const updated = [...prev];
      const row = { ...updated[idx] };
      if (field === 'counted_total_kg') {
        row.counted_total_kg = value;
        const counted = parseFloat(value) || 0;
        row.difference_kg = counted - row.system_total_kg;
      } else if (field === 'justification') {
        row.justification = value;
      }
      updated[idx] = row;
      return updated;
    });
  };

  const canConfirm = useMemo(() => {
    return rows.every(r => {
      const counted = parseFloat(r.counted_total_kg);
      if (isNaN(counted)) return false;
      const diff = counted - r.system_total_kg;
      if (Math.abs(diff) > 0.001 && !r.justification.trim()) return false;
      return true;
    });
  }, [rows]);

  const handleConfirm = async () => {
    if (!countId || !user || !canConfirm) return;
    setSubmitting(true);

    try {
      const items = rows.map(r => ({
        id: r.id,
        product_id: r.product_id,
        counted_quantity: parseFloat(r.counted_total_kg) || 0,
        counted_total_kg: parseFloat(r.counted_total_kg) || 0,
        difference_kg: (parseFloat(r.counted_total_kg) || 0) - r.system_total_kg,
        justification: r.justification.trim() || null,
        system_quantity: r.system_quantity,
        system_total_kg: r.system_total_kg,
      }));

      const { error } = await confirmCount(countId, items, selectedLocation, user.id, user.fullName);
      if (error) throw error;

      await refetchStock();
      toast.success('Contagem confirmada! Estoque ajustado.');
      setStep('done');
    } catch (err: any) {
      toast.error('Erro: ' + (err.message || err));
    } finally {
      setSubmitting(false);
    }
  };

  const filteredRows = useMemo(() => {
    if (!search) return rows;
    const q = search.toLowerCase();
    return rows.filter(r => r.product_name.toLowerCase().includes(q) || r.category.toLowerCase().includes(q));
  }, [rows, search]);

  const totalDifferences = useMemo(() =>
    rows.filter(r => Math.abs((parseFloat(r.counted_total_kg) || 0) - r.system_total_kg) > 0.001).length,
    [rows]
  );

  if (!user) return null;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="bg-card border-b-2 border-border sticky top-0 z-10 p-4">
        <div className="flex items-center gap-3">
          <button onClick={() => setLocation('/operator')} className="p-2 bg-secondary hover:bg-secondary/80 rounded-lg transition-colors touch-target">
            <ArrowLeft className="w-5 h-5 text-foreground" />
          </button>
          <div>
            <h1 className="text-xl font-black text-foreground flex items-center gap-2">
              <ClipboardList className="w-5 h-5 text-primary" /> Contagem de Inventário
            </h1>
            <p className="text-muted-foreground text-xs">Snapshot físico • Ajuste automático</p>
          </div>
        </div>
      </div>

      <div className="flex-1 p-4 max-w-4xl mx-auto w-full">
        {step === 'select' && (
          <div className="space-y-4">
            <div className="bg-card border-2 border-border rounded-lg p-4">
              <p className="text-muted-foreground text-sm mb-4">
                Selecione o local para iniciar a contagem física. O sistema carregará todos os produtos com estoque registrado.
              </p>

              <div className="space-y-2 mb-4">
                <label className="text-foreground font-bold text-sm">Local</label>
                <select value={selectedLocation} onChange={e => setSelectedLocation(e.target.value)}
                  className="w-full bg-input border-2 border-border rounded-lg p-3 text-foreground font-semibold touch-target">
                  <option value="">Selecione...</option>
                  {COUNTABLE_LOCATIONS.map(loc => (
                    <option key={loc} value={loc}>{loc}</option>
                  ))}
                </select>
              </div>
            </div>

            <button onClick={handleStartCount} disabled={!selectedLocation || submitting}
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-black text-lg py-4 rounded-xl transition-colors touch-target disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
              {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <ClipboardList className="w-5 h-5" />}
              {submitting ? 'CRIANDO...' : 'INICIAR CONTAGEM'}
            </button>

            {/* Recent counts */}
            {counts.length > 0 && (
              <div className="bg-card border-2 border-border rounded-lg overflow-hidden mt-6">
                <div className="px-4 py-3 bg-secondary border-b-2 border-border">
                  <h3 className="text-foreground font-bold text-sm">Contagens Recentes</h3>
                </div>
                <div className="divide-y divide-border max-h-[300px] overflow-y-auto">
                  {counts.slice(0, 20).map(c => (
                    <div key={c.id} className="px-4 py-3 flex justify-between items-center">
                      <div>
                        <p className="text-foreground font-bold text-sm">{c.location_code}</p>
                        <p className="text-muted-foreground text-xs">
                          {c.created_by_name} • {new Date(c.created_at).toLocaleString('pt-BR')}
                        </p>
                      </div>
                      <span className={`px-2 py-1 rounded text-xs font-bold ${
                        c.status === 'confirmed' ? 'bg-industrial-success/20 text-industrial-success' : 'bg-industrial-warning/20 text-industrial-warning'
                      }`}>
                        {c.status === 'confirmed' ? 'Confirmada' : 'Rascunho'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {step === 'count' && (
          <div className="space-y-4">
            <div className="bg-card border-2 border-primary rounded-lg p-4 flex justify-between items-center">
              <div>
                <p className="text-primary font-black text-lg">📋 Contagem: {selectedLocation}</p>
                <p className="text-muted-foreground text-sm">{rows.length} produtos • {totalDifferences} com diferença</p>
              </div>
            </div>

            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input type="text" value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Buscar produto..."
                className="w-full bg-input border-2 border-border rounded-lg pl-10 pr-4 py-3 text-foreground placeholder-muted-foreground" />
            </div>

            <div className="space-y-2">
              {filteredRows.map((row, idx) => {
                const realIdx = rows.findIndex(r => r.id === row.id);
                const counted = parseFloat(row.counted_total_kg);
                const hasDiff = !isNaN(counted) && Math.abs(counted - row.system_total_kg) > 0.001;
                const needsJustification = hasDiff && !row.justification.trim();

                return (
                  <div key={row.id} className={`bg-card border-2 rounded-lg p-4 ${
                    needsJustification ? 'border-destructive' : hasDiff ? 'border-industrial-warning' : 'border-border'
                  }`}>
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <p className="text-foreground font-bold text-sm">{row.product_name}</p>
                        <p className="text-muted-foreground text-xs">{row.category}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-muted-foreground text-xs">Sistema</p>
                        <p className="text-foreground font-black">{row.system_total_kg.toFixed(2)} kg</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-muted-foreground text-xs font-bold mb-1 block">Contagem (kg)</label>
                        <input type="number" step="0.01" min={0}
                          value={row.counted_total_kg}
                          onChange={e => updateRow(realIdx, 'counted_total_kg', e.target.value)}
                          placeholder="0.00"
                          className="w-full bg-input border-2 border-border rounded-lg px-3 py-2 text-foreground font-bold text-lg" />
                      </div>
                      <div>
                        <label className="text-muted-foreground text-xs font-bold mb-1 block">Diferença</label>
                        <div className={`px-3 py-2 rounded-lg border-2 font-bold text-lg ${
                          !isNaN(counted) && hasDiff
                            ? row.difference_kg > 0
                              ? 'bg-industrial-success/10 border-industrial-success/30 text-industrial-success'
                              : 'bg-destructive/10 border-destructive/30 text-destructive'
                            : 'bg-secondary border-border text-muted-foreground'
                        }`}>
                          {!isNaN(counted) ? `${row.difference_kg > 0 ? '+' : ''}${row.difference_kg.toFixed(2)}` : '—'}
                        </div>
                      </div>
                    </div>

                    {hasDiff && (
                      <div className="mt-3">
                        <label className="text-muted-foreground text-xs font-bold mb-1 flex items-center gap-1">
                          {needsJustification && <AlertTriangle className="w-3 h-3 text-destructive" />}
                          Justificativa {needsJustification && <span className="text-destructive">(obrigatória)</span>}
                        </label>
                        <input type="text"
                          value={row.justification}
                          onChange={e => updateRow(realIdx, 'justification', e.target.value)}
                          placeholder="Motivo da diferença..."
                          className={`w-full bg-input border-2 rounded-lg px-3 py-2 text-foreground text-sm ${
                            needsJustification ? 'border-destructive' : 'border-border'
                          }`} />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="flex gap-3 sticky bottom-4">
              <button onClick={() => { setStep('select'); setRows([]); setCountId(null); }}
                className="flex-1 bg-secondary hover:bg-secondary/80 text-secondary-foreground font-bold py-4 rounded-xl transition-colors touch-target">
                CANCELAR
              </button>
              <button onClick={handleConfirm} disabled={submitting || !canConfirm}
                className="flex-1 bg-industrial-success hover:bg-industrial-success/90 text-industrial-success-foreground font-black py-4 rounded-xl transition-colors touch-target disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle2 className="w-5 h-5" />}
                {submitting ? 'CONFIRMANDO...' : 'CONFIRMAR CONTAGEM'}
              </button>
            </div>

            {!canConfirm && (
              <div className="bg-destructive/10 border-2 border-destructive/30 rounded-lg p-3">
                <p className="text-destructive font-bold text-sm flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" />
                  Preencha todas as contagens e justifique as diferenças antes de confirmar.
                </p>
              </div>
            )}
          </div>
        )}

        {step === 'done' && (
          <div className="space-y-4">
            <div className="bg-card border-2 border-industrial-success rounded-lg p-6 text-center">
              <CheckCircle2 className="w-16 h-16 text-industrial-success mx-auto mb-4" />
              <h2 className="text-foreground font-black text-2xl mb-2">Contagem Confirmada!</h2>
              <p className="text-muted-foreground">
                Local: <span className="text-primary font-bold">{selectedLocation}</span> •
                {totalDifferences} ajustes aplicados
              </p>
              <p className="text-muted-foreground text-xs mt-2">
                ✅ Estoque ajustado • Diferenças registradas • Trilha de auditoria gerada
              </p>
            </div>

            <div className="flex gap-3">
              <button onClick={() => { setStep('select'); setRows([]); setCountId(null); setSelectedLocation(''); }}
                className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground font-bold py-4 rounded-xl transition-colors touch-target">
                NOVA CONTAGEM
              </button>
              <button onClick={() => setLocation('/operator')}
                className="flex-1 bg-secondary hover:bg-secondary/80 text-secondary-foreground font-bold py-4 rounded-xl transition-colors touch-target">
                VOLTAR AO MENU
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
