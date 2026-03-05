import React, { useState, useMemo } from 'react';
import { useLocation } from 'wouter';
import { useAuth } from '@/contexts/AuthContext';
import { useIndustrialProducts, useStock } from '@/hooks/useIndustrialData';
import { useFormulations, useFormulationItems, useProductionOrders } from '@/hooks/useProductionData';
import { useMixers } from '@/hooks/useMixers';
import { calculateProduction, type ProductionSummary, type CalculatedItem } from '@/engine/productionEngine';
import { toast } from 'sonner';
import { Factory, Beaker, Settings2, Hash, CheckCircle2, AlertTriangle, Loader2, Package } from 'lucide-react';
import { IndustrialButton } from '@/components/IndustrialButton';

type Step = 'configure' | 'review' | 'done';

export default function ProductionOrderPage() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const { products } = useIndustrialProducts();
  const { stock, refetch: refetchStock } = useStock();
  const { formulations } = useFormulations();
  const { mixers } = useMixers();
  const { confirmProduction } = useProductionOrders();

  const [step, setStep] = useState<Step>('configure');
  const [selectedFormulationId, setSelectedFormulationId] = useState('');
  const [selectedMixerId, setSelectedMixerId] = useState('');
  const [batchesStr, setBatchesStr] = useState('1');
  const [submitting, setSubmitting] = useState(false);
  const [summary, setSummary] = useState<ProductionSummary | null>(null);
  const [resultBatchCode, setResultBatchCode] = useState<string | null>(null);
  const [overrides, setOverrides] = useState<Record<string, string>>({});
  const batches = Math.max(1, parseInt(batchesStr) || 1);
  const [justifications, setJustifications] = useState<Record<string, string>>({});

  const selectedFormulation = formulations.find(f => f.id === selectedFormulationId);
  const activeMixers = useMemo(() => mixers.filter(m => m.active), [mixers]);
  const selectedMixer = activeMixers.find(m => m.id === selectedMixerId);

  const { items: formulationItems } = useFormulationItems(selectedFormulationId || null);

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
    if (!selectedFormulation || formulationItems.length === 0) {
      toast.error('Formulação não encontrada ou sem itens');
      return;
    }
    const result = calculateProduction(selectedFormulation, formulationItems, batches, productsMap, pcpStockMap);
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

  const getPackageError = (item: CalculatedItem): string | null => {
    const ov = overrides[item.product_id];
    if (ov === undefined) return null;
    const val = parseFloat(ov);
    if (isNaN(val)) return null;
    if (item.package_type === 'sealed_bag' && item.package_weight > 0) {
      const remainder = val % item.package_weight;
      if (remainder > 0.001) return `Deve ser múltiplo de ${item.package_weight}kg`;
    }
    return null;
  };

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

  // Capacity warning
  const capacityWarning = useMemo(() => {
    if (!selectedMixer) return null;
    const maxBatches = (selectedMixer as any).max_batches_per_day;
    if (maxBatches && batches > maxBatches) {
      return `Capacidade excedida: ${batches} batidas solicitadas, máximo ${maxBatches}/dia`;
    }
    return null;
  }, [selectedMixer, batches]);

  const handleConfirm = async () => {
    if (!summary || !user || !selectedFormulation) return;
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

      const mixerName = selectedMixer?.name || null;

      const { data, error } = await confirmProduction({
        formulation_id: selectedFormulation.id,
        final_product: selectedFormulation.final_product,
        machine: mixerName,
        batches: summary.batches,
        weight_per_batch: selectedFormulation.weight_per_batch,
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
    <div className="p-4 max-w-3xl mx-auto w-full">
      {step === 'configure' && (
        <div className="space-y-4">
          <div className="bg-card border-2 border-border rounded-lg p-4">
            <p className="text-muted-foreground text-sm mb-4">
              <Beaker className="w-4 h-4 inline mr-1" />
              Selecione a formulação, misturador e número de batidas.
            </p>

            {/* Step 1: Formulation */}
            <div className="space-y-2 mb-4">
              <label className="text-foreground font-bold text-sm flex items-center gap-1">
                <Beaker className="w-4 h-4" /> Formulação
              </label>
              <select
                value={selectedFormulationId}
                onChange={e => { setSelectedFormulationId(e.target.value); setSelectedMixerId(''); }}
                className="w-full bg-input border-2 border-border rounded-lg p-3 text-foreground font-semibold touch-target"
              >
                <option value="">Selecione uma formulação...</option>
                {formulations.map(f => (
                  <option key={f.id} value={f.id}>
                    {f.name} — {f.final_product} ({f.weight_per_batch} kg/batida)
                  </option>
                ))}
              </select>
            </div>

            {/* Step 2: Mixer */}
            <div className="space-y-2 mb-4">
              <label className="text-foreground font-bold text-sm flex items-center gap-1">
                <Settings2 className="w-4 h-4" /> Misturador
              </label>
              <select
                value={selectedMixerId}
                onChange={e => setSelectedMixerId(e.target.value)}
                disabled={!selectedFormulationId}
                className="w-full bg-input border-2 border-border rounded-lg p-3 text-foreground font-semibold touch-target disabled:opacity-50"
              >
                <option value="">Selecione um misturador...</option>
                {activeMixers.map(m => (
                  <option key={m.id} value={m.id}>
                    {m.name} — {m.capacity_kg} kg
                  </option>
                ))}
              </select>
            </div>

            {/* Step 3: Batches */}
            <div className="space-y-2 mb-4">
              <label className="text-foreground font-bold text-sm flex items-center gap-1">
                <Hash className="w-4 h-4" /> Número de Batidas
              </label>
              <input type="text" inputMode="numeric" value={batchesStr}
                onChange={e => setBatchesStr(e.target.value)}
                className="w-full bg-input border-2 border-border rounded-lg p-3 text-foreground font-bold text-2xl text-center touch-target" />
            </div>

            {/* Capacity Warning */}
            {capacityWarning && (
              <div className="bg-destructive/10 border-2 border-destructive/30 rounded-lg p-3 mb-4 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-destructive flex-shrink-0 mt-0.5" />
                <p className="text-destructive text-sm font-bold">{capacityWarning}</p>
              </div>
            )}

            {/* Auto-calculated summary */}
            {selectedFormulation && (
              <div className="bg-secondary rounded-lg p-3 border border-border">
                <p className="text-foreground text-sm font-bold">📋 {selectedFormulation.name}</p>
                <p className="text-muted-foreground text-xs mt-1">
                  Produto Final: <span className="text-foreground font-semibold">{selectedFormulation.final_product}</span>
                </p>
                <p className="text-muted-foreground text-xs mt-1">
                  Peso/batida: {selectedFormulation.weight_per_batch} kg •
                  Total: <span className="text-primary font-bold">{(batches * selectedFormulation.weight_per_batch).toFixed(1)} kg</span>
                </p>
                <p className="text-muted-foreground text-xs">Itens na formulação: {formulationItems.length}</p>
                {selectedMixer && (
                  <p className="text-muted-foreground text-xs mt-1">
                    Misturador: <span className="text-foreground font-semibold">{selectedMixer.name}</span> ({selectedMixer.capacity_kg} kg)
                  </p>
                )}
              </div>
            )}
          </div>

          <IndustrialButton onClick={handleCalculate} disabled={!selectedFormulation || formulationItems.length === 0}
            className="w-full"
            variant="primary"
            size="lg"
          >
            CALCULAR PRODUÇÃO
          </IndustrialButton>
        </div>
      )}

      {step === 'review' && summary && (
        <div className="space-y-4">
          <div className="bg-card border-2 border-primary rounded-lg p-4">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-primary font-black text-lg">{summary.formulation.name}</p>
                <p className="text-muted-foreground text-sm">
                  {summary.formulation.final_product} • {selectedMixer?.name || 'Sem misturador'} • {summary.batches} batidas
                </p>
              </div>
              <div className="text-right">
                <p className="text-foreground text-2xl font-black">{summary.total_compound_kg.toFixed(1)}</p>
                <p className="text-muted-foreground text-xs">kg composto</p>
                {summary.total_rounding_loss_kg > 0 && (
                  <p className="text-industrial-warning text-xs font-bold mt-1">
                    Perda arredondamento: +{summary.total_rounding_loss_kg.toFixed(2)}kg
                  </p>
                )}
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
                      <div className="mt-2 space-y-1">
                        <div className="flex items-center gap-2">
                          <Package className="w-3 h-3 text-industrial-warning" />
                          <p className="text-industrial-warning text-xs font-semibold">
                            {item.sacks_required} sacos × {item.package_weight}kg = {item.adjusted_quantity_kg.toFixed(2)}kg
                          </p>
                        </div>
                        {item.rounding_loss_kg > 0 && (
                          <p className="text-muted-foreground text-xs ml-5">
                            Perda por arredondamento: <span className="text-industrial-warning font-bold">+{item.rounding_loss_kg.toFixed(2)}kg</span>
                          </p>
                        )}
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
            <IndustrialButton onClick={() => { setStep('configure'); setSummary(null); }}
              className="flex-1"
              variant="secondary"
              size="lg"
            >
              VOLTAR
            </IndustrialButton>
            <IndustrialButton onClick={handleConfirm} disabled={submitting || !allStockOk}
              className="flex-1"
              variant="success"
              size="lg"
              icon={submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle2 className="w-5 h-5" />}
              >
              {submitting ? 'PROCESSANDO...' : 'CONFIRMAR PRODUÇÃO'}
            </IndustrialButton>
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
              {summary.formulation.name} • {summary.formulation.final_product} • {selectedMixer?.name || 'Sem misturador'} • {summary.batches} batidas
            </p>
            <p className="text-foreground font-bold text-lg mt-2">
              {summary.total_compound_kg.toFixed(1)} kg
            </p>
            <p className="text-muted-foreground text-xs mt-2">
              ✅ Estoque deduzido do PCP • Lote criado • Transferência PCP→PMP registrada
            </p>
          </div>

          <div className="flex gap-3">
            <IndustrialButton
              onClick={() => {
                setStep('configure');
                setSummary(null);
                setSelectedFormulationId('');
                setSelectedMixerId('');
                setBatchesStr('1');
                setResultBatchCode(null);
              }}
              className="flex-1"
              variant="primary"
              size="lg"
              icon={<Factory className="w-5 h-5" />}
            >
              NOVA PRODUÇÃO
            </IndustrialButton>
            <IndustrialButton onClick={() => setLocation('/operator')}
              className="flex-1"
              variant="secondary"
              size="lg"
            >
              VOLTAR AO MENU
            </IndustrialButton>
          </div>
        </div>
      )}
    </div>
  );
}
