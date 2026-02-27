import React, { useState, useMemo } from 'react';
import { useLocation } from 'wouter';
import { useAuth } from '@/contexts/AuthContext';
import { useIndustrialProducts, useStock } from '@/hooks/useIndustrialData';
import { useFormulations, useFormulationItems, useProductionOrders } from '@/hooks/useProductionData';
import { calculateProduction, type ProductionSummary, type CalculatedItem } from '@/lib/productionEngine';
import { toast } from 'sonner';
import { ArrowLeft, Factory, Beaker, Settings2, Hash, CheckCircle2, AlertTriangle, Loader2, Package } from 'lucide-react';

type Step = 'configure' | 'review' | 'done';

export default function ProductionOrderPage() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const { products } = useIndustrialProducts();
  const { stock, refetch: refetchStock } = useStock();
  const { formulations } = useFormulations();
  const { confirmProduction } = useProductionOrders();

  const [step, setStep] = useState<Step>('configure');
  const [selectedProduct, setSelectedProduct] = useState('');
  const [selectedMachine, setSelectedMachine] = useState('');
  const [batchesStr, setBatchesStr] = useState('1');
  const [submitting, setSubmitting] = useState(false);
  const [summary, setSummary] = useState<ProductionSummary | null>(null);
  const [resultBatchCode, setResultBatchCode] = useState<string | null>(null);
  const [overrides, setOverrides] = useState<Record<string, string>>({});
  const batches = Math.max(1, parseInt(batchesStr) || 1);
  const [justifications, setJustifications] = useState<Record<string, string>>({});

  const finalProducts = useMemo(() => [...new Set(formulations.map(f => f.final_product))], [formulations]);
  const machines = useMemo(() => {
    if (!selectedProduct) return [];
    return [...new Set(formulations.filter(f => f.final_product === selectedProduct).map(f => f.machine))];
  }, [formulations, selectedProduct]);

  const matchedFormulation = useMemo(() =>
    formulations.find(f => f.final_product === selectedProduct && f.machine === selectedMachine),
    [formulations, selectedProduct, selectedMachine]
  );

  const { items: formulationItems } = useFormulationItems(matchedFormulation?.id || null);

  const productsMap = useMemo(() => {
    const m = new Map<string, typeof products[0]>();
    products.forEach(p => m.set(p.id, p));
    return m;
  }, [products]);

  const pcpStockMap = useMemo(() => {
    const m = new Map<string, number>();
    stock.filter(s => s.location_code === 'PCP').forEach(s => {
      m.set(s.product_id, Number(s.total_kg));
    });
    return m;
  }, [stock]);

  const handleCalculate = () => {
    if (!matchedFormulation || formulationItems.length === 0) {
      toast.error('Formulação não encontrada ou sem itens');
      return;
    }
    const result = calculateProduction(matchedFormulation, formulationItems, batches, productsMap, pcpStockMap);
    setSummary(result);
    setOverrides({});
    setJustifications({});
    setStep('review');
  };

  const getEffectiveAdjusted = (item: CalculatedItem) => {
    const ov = overrides[item.product_id];
    if (ov !== undefined) {
      const parsed = parseFloat(ov);
      return isNaN(parsed) ? 0 : parsed;
    }
    return item.adjusted_quantity_kg;
  };

  // Package validation: sealed_bag overrides must be multiples of package_weight
  const getPackageError = (item: CalculatedItem): string | null => {
    const ov = overrides[item.product_id];
    if (ov === undefined) return null;
    const val = parseFloat(ov);
    if (isNaN(val)) return null;
    if (item.package_type === 'sealed_bag' && item.package_weight > 0) {
      const remainder = val % item.package_weight;
      if (remainder > 0.001) {
        return `Deve ser múltiplo de ${item.package_weight}kg`;
      }
    }
    return null;
  };

  // Check if item has a manual override (different from natural rounding)
  const isManualOverride = (item: CalculatedItem): boolean => {
    const ov = overrides[item.product_id];
    if (ov === undefined) return false;
    const val = parseFloat(ov);
    if (isNaN(val)) return false;
    return Math.abs(val - item.adjusted_quantity_kg) > 0.001;
  };

  const getJustificationError = (item: CalculatedItem): string | null => {
    if (!isManualOverride(item)) return null;
    const j = justifications[item.product_id];
    if (!j || j.trim().length === 0) return 'Justificativa obrigatória para ajuste manual';
    return null;
  };

  const allStockOk = useMemo(() => {
    if (!summary) return false;
    return summary.items.every(i => {
      const adj = getEffectiveAdjusted(i);
      return i.pcp_available_kg >= adj && !getPackageError(i) && !getJustificationError(i);
    });
  }, [summary, overrides, justifications]);

  const handleConfirm = async () => {
    if (!summary || !user || !matchedFormulation) return;
    setSubmitting(true);

    try {
      const itemsPayload = summary.items.map(item => {
        const adj = getEffectiveAdjusted(item);
        return {
          product_id: item.product_id,
          ideal_quantity_kg: item.ideal_quantity_kg,
          adjusted_quantity_kg: adj,
          difference_kg: adj - item.ideal_quantity_kg,
          package_type: item.package_type,
          package_weight: item.package_weight,
          justification: isManualOverride(item) ? justifications[item.product_id] || null : null,
        };
      });

      const { data, error } = await confirmProduction({
        formulation_id: matchedFormulation.id,
        final_product: summary.formulation.final_product,
        machine: summary.formulation.machine,
        batches: summary.batches,
        weight_per_batch: summary.formulation.weight_per_batch,
        total_compound_kg: summary.total_compound_kg,
        user_id: user.id,
        user_name: user.fullName,
        items: itemsPayload,
      });

      if (error) throw error;

      setResultBatchCode(data?.batch_code || null);
      await refetchStock();
      toast.success('Produção confirmada com sucesso!');
      setStep('done');
    } catch (err: any) {
      toast.error('Erro ao confirmar produção: ' + (err.message || err));
    } finally {
      setSubmitting(false);
    }
  };

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
              <Factory className="w-5 h-5 text-primary" /> Ordem de Produção
            </h1>
            <p className="text-muted-foreground text-xs">PCP → PMP • Transação Atômica</p>
          </div>
        </div>
      </div>

      <div className="flex-1 p-4 max-w-3xl mx-auto w-full">
        {step === 'configure' && (
          <div className="space-y-4">
            <div className="bg-card border-2 border-border rounded-lg p-4">
              <p className="text-muted-foreground text-sm mb-4">
                <Beaker className="w-4 h-4 inline mr-1" />
                Selecione o produto final, máquina e número de batidas.
              </p>

              <div className="space-y-2 mb-4">
                <label className="text-foreground font-bold text-sm">Produto Final</label>
                <select value={selectedProduct} onChange={e => { setSelectedProduct(e.target.value); setSelectedMachine(''); }}
                  className="w-full bg-input border-2 border-border rounded-lg p-3 text-foreground font-semibold touch-target">
                  <option value="">Selecione...</option>
                  {finalProducts.map(fp => <option key={fp} value={fp}>{fp}</option>)}
                </select>
              </div>

              <div className="space-y-2 mb-4">
                <label className="text-foreground font-bold text-sm flex items-center gap-1">
                  <Settings2 className="w-4 h-4" /> Máquina
                </label>
                <select value={selectedMachine} onChange={e => setSelectedMachine(e.target.value)} disabled={!selectedProduct}
                  className="w-full bg-input border-2 border-border rounded-lg p-3 text-foreground font-semibold touch-target disabled:opacity-50">
                  <option value="">Selecione...</option>
                  {machines.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>

              <div className="space-y-2 mb-4">
                <label className="text-foreground font-bold text-sm flex items-center gap-1">
                  <Hash className="w-4 h-4" /> Número de Batidas
                </label>
                <input type="text" inputMode="numeric" value={batchesStr}
                  onChange={e => setBatchesStr(e.target.value)}
                  className="w-full bg-input border-2 border-border rounded-lg p-3 text-foreground font-bold text-2xl text-center touch-target" />
              </div>

              {matchedFormulation && (
                <div className="bg-secondary rounded-lg p-3 border border-border">
                  <p className="text-foreground text-sm font-bold">📋 {matchedFormulation.name}</p>
                  <p className="text-muted-foreground text-xs mt-1">
                    Peso/batida: {matchedFormulation.weight_per_batch} kg •
                    Total: <span className="text-primary font-bold">{(batches * matchedFormulation.weight_per_batch).toFixed(1)} kg</span>
                  </p>
                  <p className="text-muted-foreground text-xs">Itens na formulação: {formulationItems.length}</p>
                </div>
              )}
            </div>

            <button onClick={handleCalculate} disabled={!matchedFormulation || formulationItems.length === 0}
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-black text-lg py-4 rounded-xl transition-colors touch-target disabled:opacity-50 disabled:cursor-not-allowed">
              CALCULAR PRODUÇÃO
            </button>
          </div>
        )}

        {step === 'review' && summary && (
          <div className="space-y-4">
            <div className="bg-card border-2 border-primary rounded-lg p-4">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-primary font-black text-lg">{summary.formulation.final_product}</p>
                  <p className="text-muted-foreground text-sm">{summary.formulation.machine} • {summary.batches} batidas</p>
                </div>
                <div className="text-right">
                  <p className="text-foreground text-2xl font-black">{summary.total_compound_kg.toFixed(1)}</p>
                  <p className="text-muted-foreground text-xs">kg composto</p>
                </div>
              </div>
            </div>

            <div className="bg-card border-2 border-border rounded-lg overflow-hidden">
              <div className="px-4 py-3 bg-secondary border-b-2 border-border">
                <h3 className="text-foreground font-bold text-sm">Matérias-Primas</h3>
              </div>
              <div className="divide-y divide-border">
                {summary.items.map(item => {
                  const effectiveAdj = getEffectiveAdjusted(item);
                  const hasStock = item.pcp_available_kg >= effectiveAdj;
                  const pkgErr = getPackageError(item);
                  return (
                    <div key={item.product_id} className={`p-4 ${!hasStock || pkgErr ? 'bg-destructive/5' : ''}`}>
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-foreground font-bold text-sm truncate">{item.product_name}</p>
                          <p className="text-muted-foreground text-xs">{item.category}</p>
                        </div>
                        <div className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-bold ${
                          hasStock && !pkgErr ? 'bg-industrial-success/20 text-industrial-success' : 'bg-destructive/20 text-destructive'
                        }`}>
                          {hasStock && !pkgErr ? <CheckCircle2 className="w-3 h-3" /> : <AlertTriangle className="w-3 h-3" />}
                          {!hasStock ? 'INSUFICIENTE' : pkgErr ? 'INVÁLIDO' : 'OK'}
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-2 text-xs">
                        <div>
                          <p className="text-muted-foreground">Ideal</p>
                          <p className="text-foreground font-bold">{item.ideal_quantity_kg.toFixed(2)} kg</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Ajustado</p>
                          <input type="text" inputMode="decimal"
                            value={overrides[item.product_id] !== undefined ? overrides[item.product_id] : effectiveAdj}
                            onChange={e => setOverrides(prev => ({
                              ...prev, [item.product_id]: e.target.value,
                            }))}
                            className={`w-full bg-input border rounded px-2 py-1 text-foreground font-bold text-sm ${pkgErr ? 'border-destructive' : 'border-border'}`} />
                          {pkgErr && <p className="text-destructive text-[10px] mt-1">{pkgErr}</p>}
                        </div>
                        <div>
                          <p className="text-muted-foreground">Disponível PCP</p>
                          <p className={`font-bold ${hasStock ? 'text-industrial-success' : 'text-destructive'}`}>
                            {item.pcp_available_kg.toFixed(2)} kg
                          </p>
                        </div>
                      </div>

                      {item.package_type === 'sealed_bag' && item.sacks_required !== null && (
                        <div className="mt-2 flex items-center gap-2">
                          <Package className="w-3 h-3 text-industrial-warning" />
                          <p className="text-industrial-warning text-xs font-semibold">
                            {item.sacks_required} sacos × {item.package_weight}kg = {item.adjusted_quantity_kg.toFixed(2)}kg
                            {item.difference_kg > 0 && ` (+${item.difference_kg.toFixed(2)}kg excedente)`}
                          </p>
                        </div>
                      )}

                      {isManualOverride(item) && (
                        <div className="mt-2">
                          <label className="text-destructive text-xs font-bold">⚠ Justificativa (obrigatória):</label>
                          <input
                            type="text"
                            placeholder="Ex: Saco danificado, ajuste de lote..."
                            value={justifications[item.product_id] || ''}
                            onChange={e => setJustifications(prev => ({ ...prev, [item.product_id]: e.target.value }))}
                            className={`w-full mt-1 bg-input border rounded px-2 py-1 text-foreground text-xs ${
                              getJustificationError(item) ? 'border-destructive' : 'border-border'
                            }`}
                          />
                          {getJustificationError(item) && (
                            <p className="text-destructive text-[10px] mt-1">{getJustificationError(item)}</p>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="flex gap-3">
              <button onClick={() => { setStep('configure'); setSummary(null); }}
                className="flex-1 bg-secondary hover:bg-secondary/80 text-secondary-foreground font-bold py-4 rounded-xl transition-colors touch-target">
                VOLTAR
              </button>
              <button onClick={handleConfirm} disabled={submitting || !allStockOk}
                className="flex-1 bg-industrial-success hover:bg-industrial-success/90 text-industrial-success-foreground font-black py-4 rounded-xl transition-colors touch-target disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle2 className="w-5 h-5" />}
                {submitting ? 'PROCESSANDO...' : 'CONFIRMAR PRODUÇÃO'}
              </button>
            </div>

            {!allStockOk && (
              <div className="bg-destructive/10 border-2 border-destructive/30 rounded-lg p-3">
                <p className="text-destructive font-bold text-sm flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" />
                  Estoque insuficiente ou quantidade inválida. Ajuste antes de confirmar.
                </p>
              </div>
            )}
          </div>
        )}

        {step === 'done' && summary && (
          <div className="space-y-4">
            <div className="bg-card border-2 border-industrial-success rounded-lg p-6 text-center">
              <CheckCircle2 className="w-16 h-16 text-industrial-success mx-auto mb-4" />
              <h2 className="text-foreground font-black text-2xl mb-2">Produção Confirmada!</h2>
              {resultBatchCode && (
                <div className="bg-secondary rounded-lg p-3 inline-block mb-3">
                  <p className="text-muted-foreground text-xs">Código do Lote</p>
                  <p className="text-primary font-black text-xl">{resultBatchCode}</p>
                </div>
              )}
              <p className="text-muted-foreground">
                {summary.formulation.final_product} • {summary.formulation.machine} • {summary.batches} batidas
              </p>
              <p className="text-primary font-bold text-xl mt-2">
                {summary.total_compound_kg.toFixed(1)} kg de composto
              </p>
              <p className="text-muted-foreground text-xs mt-2">
                ✅ Transação atômica • Estoque PCP deduzido • Transferência PCP→PMP • Lote rastreável
              </p>
            </div>

            <div className="flex gap-3">
              <button onClick={() => { setStep('configure'); setSummary(null); setSelectedProduct(''); setSelectedMachine(''); setBatchesStr('1'); setResultBatchCode(null); }}
                className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground font-bold py-4 rounded-xl transition-colors touch-target">
                NOVA PRODUÇÃO
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
