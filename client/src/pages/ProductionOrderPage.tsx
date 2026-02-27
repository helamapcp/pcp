import React, { useState, useMemo } from 'react';
import { useLocation } from 'wouter';
import { useAuth } from '@/contexts/AuthContext';
import { useIndustrialProducts, useStock, useStockMovements } from '@/hooks/useIndustrialData';
import { useFormulations, useFormulationItems, useProductionOrders } from '@/hooks/useProductionData';
import { calculateProduction, type ProductionSummary, type CalculatedItem } from '@/lib/productionEngine';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { ArrowLeft, Factory, Beaker, Settings2, Hash, CheckCircle2, AlertTriangle, Loader2, Package } from 'lucide-react';

type Step = 'configure' | 'review' | 'done';

export default function ProductionOrderPage() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const { products } = useIndustrialProducts();
  const { stock, getStock, upsertStock, refetch: refetchStock } = useStock();
  const { addMovement } = useStockMovements();
  const { formulations } = useFormulations();
  const { createOrder } = useProductionOrders();

  const [step, setStep] = useState<Step>('configure');
  const [selectedProduct, setSelectedProduct] = useState('');
  const [selectedMachine, setSelectedMachine] = useState('');
  const [batches, setBatches] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [summary, setSummary] = useState<ProductionSummary | null>(null);
  // Manual overrides for adjusted quantities
  const [overrides, setOverrides] = useState<Record<string, number>>({});

  // Derive unique final products and machines from formulations
  const finalProducts = useMemo(() => [...new Set(formulations.map(f => f.final_product))], [formulations]);
  const machines = useMemo(() => {
    if (!selectedProduct) return [];
    return [...new Set(formulations.filter(f => f.final_product === selectedProduct).map(f => f.machine))];
  }, [formulations, selectedProduct]);

  // Find matching formulation
  const matchedFormulation = useMemo(() =>
    formulations.find(f => f.final_product === selectedProduct && f.machine === selectedMachine),
    [formulations, selectedProduct, selectedMachine]
  );

  const { items: formulationItems } = useFormulationItems(matchedFormulation?.id || null);

  // Build maps for calculation
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
    setStep('review');
  };

  const getEffectiveAdjusted = (item: CalculatedItem) => {
    return overrides[item.product_id] ?? item.adjusted_quantity_kg;
  };

  const allStockOk = useMemo(() => {
    if (!summary) return false;
    return summary.items.every(i => {
      const adj = getEffectiveAdjusted(i);
      return i.pcp_available_kg >= adj;
    });
  }, [summary, overrides]);

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
        };
      });

      // 1. Create production order
      const { data: po, error: poErr } = await createOrder({
        formulation_id: matchedFormulation.id,
        final_product: summary.formulation.final_product,
        machine: summary.formulation.machine,
        batches: summary.batches,
        weight_per_batch: summary.formulation.weight_per_batch,
        total_compound_kg: summary.total_compound_kg,
        created_by: user.id,
        created_by_name: user.fullName,
        items: itemsPayload,
      });

      if (poErr) throw poErr;

      // 2. Deduct stock from PCP + record movements
      for (const item of summary.items) {
        const adj = getEffectiveAdjusted(item);
        const currentStock = getStock(item.product_id, 'PCP');
        const currentKg = Number(currentStock?.total_kg || 0);
        const currentQty = Number(currentStock?.quantity || 0);
        const product = productsMap.get(item.product_id);
        const unitWeight = product?.unit_weight_kg || 1;

        const newKg = Math.max(0, currentKg - adj);
        const deductedQty = unitWeight > 0 ? adj / unitWeight : adj;
        const newQty = Math.max(0, currentQty - deductedQty);

        await upsertStock(item.product_id, 'PCP', newQty, currentStock?.unit || 'kg', newKg, user.id);

        await addMovement({
          product_id: item.product_id,
          location_code: 'PCP',
          movement_type: 'production_out',
          quantity: deductedQty,
          unit: currentStock?.unit || 'kg',
          total_kg: adj,
          reference_type: 'production_order',
          reference_id: po.id,
          notes: `Produção ${summary.formulation.final_product} (${summary.formulation.machine}) - ${summary.batches} batidas | Ideal: ${item.ideal_quantity_kg.toFixed(2)}kg | Enviado: ${adj.toFixed(2)}kg`,
          user_id: user.id,
          user_name: user.fullName,
        });
      }

      // 3. Add compound to PMP
      // We use a generic "compound" record. The transfer PCP→PMP is implicit via the production order.
      const compoundStock = getStock(matchedFormulation.id, 'PMP');
      // Instead of tracking by formulation_id in stock (which expects product_id), 
      // we create a stock movement record for audit trail
      await addMovement({
        product_id: summary.items[0]?.product_id || matchedFormulation.id, // reference product
        location_code: 'PMP',
        movement_type: 'production_in',
        quantity: summary.batches,
        unit: 'batidas',
        total_kg: summary.total_compound_kg,
        reference_type: 'production_order',
        reference_id: po.id,
        notes: `Composto ${summary.formulation.final_product} (${summary.formulation.machine}) - ${summary.batches} batidas = ${summary.total_compound_kg.toFixed(2)}kg`,
        user_id: user.id,
        user_name: user.fullName,
      });

      // 4. Create automatic transfer record PCP → PMP
      const { data: transfer } = await supabase
        .from('transfers')
        .insert({
          from_location: 'PCP',
          to_location: 'PMP',
          status: 'completed',
          requested_by: user.id,
          requested_by_name: user.fullName,
          confirmed_by: user.id,
          confirmed_by_name: user.fullName,
          confirmed_at: new Date().toISOString(),
          notes: `Produção automática: ${summary.formulation.final_product} (${summary.formulation.machine}) - ${summary.batches} batidas`,
        })
        .select()
        .single();

      if (transfer) {
        const transferItems = summary.items.map(item => {
          const adj = getEffectiveAdjusted(item);
          return {
            transfer_id: transfer.id,
            product_id: item.product_id,
            requested_quantity: item.ideal_quantity_kg,
            requested_unit: 'kg',
            sent_quantity: adj,
            sent_unit: 'kg',
            sent_total_kg: adj,
            status: adj === item.ideal_quantity_kg ? 'exact' : adj > item.ideal_quantity_kg ? 'above' : 'below',
          };
        });
        await supabase.from('transfer_items').insert(transferItems);
      }

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
      {/* Header */}
      <div className="bg-card border-b-2 border-border sticky top-0 z-10 p-4">
        <div className="flex items-center gap-3">
          <button onClick={() => setLocation('/operator')} className="p-2 bg-secondary hover:bg-secondary/80 rounded-lg transition-colors touch-target">
            <ArrowLeft className="w-5 h-5 text-foreground" />
          </button>
          <div>
            <h1 className="text-xl font-black text-foreground flex items-center gap-2">
              <Factory className="w-5 h-5 text-primary" /> Ordem de Produção
            </h1>
            <p className="text-muted-foreground text-xs">PCP → PMP • Motor Produtivo</p>
          </div>
        </div>
      </div>

      <div className="flex-1 p-4 max-w-3xl mx-auto w-full">
        {/* Step: Configure */}
        {step === 'configure' && (
          <div className="space-y-4">
            <div className="bg-card border-2 border-border rounded-lg p-4">
              <p className="text-muted-foreground text-sm mb-4">
                <Beaker className="w-4 h-4 inline mr-1" />
                Selecione o produto final, máquina e número de batidas.
              </p>

              {/* Final Product */}
              <div className="space-y-2 mb-4">
                <label className="text-foreground font-bold text-sm">Produto Final</label>
                <select
                  value={selectedProduct}
                  onChange={e => { setSelectedProduct(e.target.value); setSelectedMachine(''); }}
                  className="w-full bg-input border-2 border-border rounded-lg p-3 text-foreground font-semibold touch-target"
                >
                  <option value="">Selecione...</option>
                  {finalProducts.map(fp => (
                    <option key={fp} value={fp}>{fp}</option>
                  ))}
                </select>
              </div>

              {/* Machine */}
              <div className="space-y-2 mb-4">
                <label className="text-foreground font-bold text-sm flex items-center gap-1">
                  <Settings2 className="w-4 h-4" /> Máquina
                </label>
                <select
                  value={selectedMachine}
                  onChange={e => setSelectedMachine(e.target.value)}
                  disabled={!selectedProduct}
                  className="w-full bg-input border-2 border-border rounded-lg p-3 text-foreground font-semibold touch-target disabled:opacity-50"
                >
                  <option value="">Selecione...</option>
                  {machines.map(m => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </div>

              {/* Batches */}
              <div className="space-y-2 mb-4">
                <label className="text-foreground font-bold text-sm flex items-center gap-1">
                  <Hash className="w-4 h-4" /> Número de Batidas
                </label>
                <input
                  type="number"
                  min={1}
                  max={999}
                  value={batches}
                  onChange={e => setBatches(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-full bg-input border-2 border-border rounded-lg p-3 text-foreground font-bold text-2xl text-center touch-target"
                />
              </div>

              {/* Formulation info */}
              {matchedFormulation && (
                <div className="bg-secondary rounded-lg p-3 border border-border">
                  <p className="text-foreground text-sm font-bold">📋 {matchedFormulation.name}</p>
                  <p className="text-muted-foreground text-xs mt-1">
                    Peso/batida: {matchedFormulation.weight_per_batch} kg •
                    Total: <span className="text-primary font-bold">{(batches * matchedFormulation.weight_per_batch).toFixed(1)} kg</span>
                  </p>
                  <p className="text-muted-foreground text-xs">
                    Itens na formulação: {formulationItems.length}
                  </p>
                </div>
              )}
            </div>

            <button
              onClick={handleCalculate}
              disabled={!matchedFormulation || formulationItems.length === 0}
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-black text-lg py-4 rounded-xl transition-colors touch-target disabled:opacity-50 disabled:cursor-not-allowed"
            >
              CALCULAR PRODUÇÃO
            </button>
          </div>
        )}

        {/* Step: Review */}
        {step === 'review' && summary && (
          <div className="space-y-4">
            {/* Summary header */}
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

            {/* Items table */}
            <div className="bg-card border-2 border-border rounded-lg overflow-hidden">
              <div className="px-4 py-3 bg-secondary border-b-2 border-border">
                <h3 className="text-foreground font-bold text-sm">Matérias-Primas</h3>
              </div>
              <div className="divide-y divide-border">
                {summary.items.map(item => {
                  const effectiveAdj = getEffectiveAdjusted(item);
                  const hasStock = item.pcp_available_kg >= effectiveAdj;
                  return (
                    <div key={item.product_id} className={`p-4 ${!hasStock ? 'bg-destructive/5' : ''}`}>
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-foreground font-bold text-sm truncate">{item.product_name}</p>
                          <p className="text-muted-foreground text-xs">{item.category}</p>
                        </div>
                        <div className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-bold ${
                          hasStock ? 'bg-industrial-success/20 text-industrial-success' : 'bg-destructive/20 text-destructive'
                        }`}>
                          {hasStock ? <CheckCircle2 className="w-3 h-3" /> : <AlertTriangle className="w-3 h-3" />}
                          {hasStock ? 'OK' : 'INSUFICIENTE'}
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-2 text-xs">
                        <div>
                          <p className="text-muted-foreground">Ideal</p>
                          <p className="text-foreground font-bold">{item.ideal_quantity_kg.toFixed(2)} kg</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Ajustado</p>
                          <input
                            type="number"
                            step="0.01"
                            min={0}
                            value={effectiveAdj}
                            onChange={e => setOverrides(prev => ({
                              ...prev,
                              [item.product_id]: Math.max(0, parseFloat(e.target.value) || 0),
                            }))}
                            className="w-full bg-input border border-border rounded px-2 py-1 text-foreground font-bold text-sm"
                          />
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
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex gap-3">
              <button
                onClick={() => { setStep('configure'); setSummary(null); }}
                className="flex-1 bg-secondary hover:bg-secondary/80 text-secondary-foreground font-bold py-4 rounded-xl transition-colors touch-target"
              >
                VOLTAR
              </button>
              <button
                onClick={handleConfirm}
                disabled={submitting || !allStockOk}
                className="flex-1 bg-industrial-success hover:bg-industrial-success/90 text-industrial-success-foreground font-black py-4 rounded-xl transition-colors touch-target disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle2 className="w-5 h-5" />}
                {submitting ? 'PROCESSANDO...' : 'CONFIRMAR PRODUÇÃO'}
              </button>
            </div>

            {!allStockOk && (
              <div className="bg-destructive/10 border-2 border-destructive/30 rounded-lg p-3">
                <p className="text-destructive font-bold text-sm flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" />
                  Estoque insuficiente para um ou mais itens. Ajuste as quantidades ou reponha o estoque.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Step: Done */}
        {step === 'done' && summary && (
          <div className="space-y-4">
            <div className="bg-card border-2 border-industrial-success rounded-lg p-6 text-center">
              <CheckCircle2 className="w-16 h-16 text-industrial-success mx-auto mb-4" />
              <h2 className="text-foreground font-black text-2xl mb-2">Produção Confirmada!</h2>
              <p className="text-muted-foreground">
                {summary.formulation.final_product} • {summary.formulation.machine} • {summary.batches} batidas
              </p>
              <p className="text-primary font-bold text-xl mt-2">
                {summary.total_compound_kg.toFixed(1)} kg de composto
              </p>
              <p className="text-muted-foreground text-xs mt-2">
                Estoque do PCP deduzido • Transferência PCP → PMP registrada • Auditoria completa
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => { setStep('configure'); setSummary(null); setSelectedProduct(''); setSelectedMachine(''); setBatches(1); }}
                className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground font-bold py-4 rounded-xl transition-colors touch-target"
              >
                NOVA PRODUÇÃO
              </button>
              <button
                onClick={() => setLocation('/operator')}
                className="flex-1 bg-secondary hover:bg-secondary/80 text-secondary-foreground font-bold py-4 rounded-xl transition-colors touch-target"
              >
                VOLTAR AO MENU
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
