import React, { useState, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useFormulations, useFormulationItems } from '@/hooks/useProductionData';
import { useIndustrialProducts, useStock } from '@/hooks/useIndustrialData';
import { useMixersPlanning, useProductionSchedules, usePurchaseSuggestions } from '@/hooks/usePlanningData';
import { simulateProduction, type ProductionSimulation, type PlanningIngredient } from '@/engine/planningEngine';
import { IndustrialButton } from '@/components/IndustrialButton';
import { toast } from 'sonner';
import { Factory, AlertTriangle, Package, ShoppingCart, Calendar, Check, ArrowLeft } from 'lucide-react';

export default function ProductionPlanningPage() {
  const { user } = useAuth();
  const { formulations } = useFormulations();
  const { products } = useIndustrialProducts();
  const { stock, getStock } = useStock();
  const { mixers } = useMixersPlanning();
  const { schedules, createSchedule } = useProductionSchedules();
  const { createSuggestions } = usePurchaseSuggestions();

  const [selectedFormulationId, setSelectedFormulationId] = useState('');
  const [selectedMixerId, setSelectedMixerId] = useState('');
  const [batches, setBatches] = useState('');
  const [productionDate, setProductionDate] = useState(new Date().toISOString().split('T')[0]);
  const [simulation, setSimulation] = useState<ProductionSimulation | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [mode, setMode] = useState<'form' | 'simulation' | 'schedule'>('form');

  const { items: formulationItems } = useFormulationItems(selectedFormulationId);

  const selectedFormulation = formulations.find(f => f.id === selectedFormulationId);
  const selectedMixer = mixers.find(m => m.id === selectedMixerId);

  const handleSimulate = () => {
    if (!selectedFormulation || !selectedMixer || !batches) {
      toast.error('Preencha todos os campos');
      return;
    }

    const batchCount = parseInt(batches);
    if (batchCount <= 0) {
      toast.error('Número de batidas deve ser positivo');
      return;
    }

    const planningIngredients: PlanningIngredient[] = formulationItems.map(fi => {
      const product = products.find(p => p.id === fi.product_id);
      return {
        product_id: fi.product_id,
        product_name: product?.name || 'Desconhecido',
        quantity_per_batch: fi.quantity_per_batch,
        package_type: product?.package_type || 'bulk',
        package_weight: product?.package_weight || 0,
      };
    });

    const stockMap = new Map<string, number>();
    stock.filter(s => s.location_code === 'PCP').forEach(s => {
      stockMap.set(s.product_id, Number(s.total_kg));
    });

    // Check for same-day excess from existing schedules (simplified: no excess yet)
    const excessMap = new Map<string, number>();

    const sim = simulateProduction(
      { id: selectedFormulation.id, name: selectedFormulation.name, weight_per_batch: selectedFormulation.weight_per_batch, items: planningIngredients },
      { id: selectedMixer.id, name: selectedMixer.name, capacity_kg: selectedMixer.capacity_kg, max_batches_per_day: selectedMixer.max_batches_per_day },
      batchCount,
      productionDate,
      stockMap,
      excessMap
    );

    setSimulation(sim);
    setMode('simulation');
  };

  const handleConfirmSchedule = async () => {
    if (!simulation || !user) return;
    setSubmitting(true);
    try {
      const { data, error } = await createSchedule({
        formulation_id: simulation.formulation_id,
        mixer_id: simulation.mixer_id,
        production_date: simulation.production_date,
        batches: simulation.batches,
        total_weight_kg: simulation.total_weight_kg,
        created_by: user.id,
        created_by_name: user.fullName,
      });

      if (error) throw error;

      // Create purchase suggestions if there are shortages
      if (simulation.stock_shortages.length > 0 && data) {
        await createSuggestions(
          simulation.stock_shortages.map(s => ({
            product_id: s.product_id,
            required_quantity_kg: s.required_kg,
            available_stock_kg: s.available_kg,
            suggested_purchase_kg: s.suggested_purchase_kg,
            production_schedule_id: data.id,
          }))
        );
      }

      toast.success('✓ Programação criada com sucesso!');
      setMode('schedule');
      setSimulation(null);
      setSelectedFormulationId('');
      setSelectedMixerId('');
      setBatches('');
    } catch (err: any) {
      toast.error('Erro: ' + (err.message || err));
    }
    setSubmitting(false);
  };

  // ── Simulation View ──
  if (mode === 'simulation' && simulation) {
    return (
      <div className="flex flex-col h-full">
        <div className="bg-card border-b-2 border-border p-4">
          <div className="flex items-center gap-3">
            <button onClick={() => setMode('form')} className="p-2 hover:bg-secondary rounded-lg">
              <ArrowLeft className="w-5 h-5 text-foreground" />
            </button>
            <div>
              <h1 className="text-xl font-black text-foreground">Simulação de Produção</h1>
              <p className="text-muted-foreground text-sm">{simulation.formulation_name} • {simulation.mixer_name}</p>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Capacity Warning */}
          {simulation.exceeds_capacity && (
            <div className="bg-destructive/10 border-2 border-destructive rounded-xl p-4 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-destructive font-bold text-sm">Capacidade Excedida!</p>
                <p className="text-muted-foreground text-xs">
                  Solicitado: {simulation.batches} batidas • Capacidade: {simulation.max_batches_per_day} batidas/dia
                </p>
              </div>
            </div>
          )}

          {/* Summary Card */}
          <div className="bg-card border-2 border-primary/30 rounded-xl p-4 space-y-2">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-muted-foreground text-xs">Batidas</p>
                <p className="text-foreground font-black text-lg">{simulation.batches}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Peso Total</p>
                <p className="text-foreground font-black text-lg">{simulation.total_weight_kg.toFixed(2)} kg</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Data</p>
                <p className="text-foreground font-bold">{new Date(simulation.production_date + 'T12:00:00').toLocaleDateString('pt-BR')}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Capacidade</p>
                <p className={`font-bold ${simulation.capacity_usage_percent > 100 ? 'text-destructive' : simulation.capacity_usage_percent > 80 ? 'text-industrial-warning' : 'text-industrial-success'}`}>
                  {simulation.capacity_usage_percent.toFixed(2)}%
                </p>
              </div>
            </div>
          </div>

          {/* Ingredients */}
          <div className="space-y-2">
            <h3 className="text-foreground font-bold flex items-center gap-2">
              <Package className="w-4 h-4" /> Matérias-Primas
            </h3>
            {simulation.ingredients.map(ing => {
              const hasShortage = simulation.stock_shortages.some(s => s.product_id === ing.product_id);
              return (
                <div key={ing.product_id} className={`bg-card border-2 ${hasShortage ? 'border-destructive' : 'border-border'} rounded-lg p-3`}>
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-foreground font-bold text-sm">{ing.product_name}</p>
                      <p className="text-muted-foreground text-xs">
                        Ideal: {ing.ideal_kg.toFixed(2)} kg
                        {ing.reused_excess_kg > 0 && (
                          <span className="text-industrial-success"> • Reuso: -{ing.reused_excess_kg.toFixed(2)} kg</span>
                        )}
                      </p>
                    </div>
                    <div className="text-right">
                      {ing.bags_required > 0 ? (
                        <>
                          <p className="text-primary font-black text-lg">{ing.bags_required} sacos</p>
                          <p className="text-muted-foreground text-xs">{ing.bags_kg.toFixed(2)} kg</p>
                        </>
                      ) : (
                        <p className="text-foreground font-black text-lg">{ing.ideal_kg.toFixed(2)} kg</p>
                      )}
                    </div>
                  </div>
                  {ing.excess_kg > 0 && (
                    <p className="text-industrial-warning text-xs mt-1">
                      ⚠️ Excedente: +{ing.excess_kg.toFixed(2)} kg (arredondamento de sacos)
                    </p>
                  )}
                  {hasShortage && (
                    <p className="text-destructive text-xs mt-1 font-bold">
                      ❌ Estoque insuficiente
                    </p>
                  )}
                </div>
              );
            })}
          </div>

          {/* Excess Summary */}
          {simulation.total_excess_kg > 0 && (
            <div className="bg-industrial-warning/10 border-2 border-industrial-warning rounded-xl p-4">
              <p className="text-foreground font-bold text-sm">Excedente Total por Arredondamento</p>
              <p className="text-industrial-warning font-black text-xl">{simulation.total_excess_kg.toFixed(2)} kg</p>
              <p className="text-muted-foreground text-xs">Será registrado como estoque excedente no PMP</p>
            </div>
          )}

          {/* Purchase Suggestions */}
          {simulation.stock_shortages.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-destructive font-bold flex items-center gap-2">
                <ShoppingCart className="w-4 h-4" /> Necessidade de Compra
              </h3>
              {simulation.stock_shortages.map(s => (
                <div key={s.product_id} className="bg-card border-2 border-destructive/30 rounded-lg p-3">
                  <div className="flex justify-between">
                    <div>
                      <p className="text-foreground font-bold text-sm">{s.product_name}</p>
                      <p className="text-muted-foreground text-xs">
                        Disponível: {s.available_kg.toFixed(1)} kg • Necessário: {s.required_kg.toFixed(1)} kg
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-destructive font-black">{s.suggested_purchase_kg.toFixed(1)} kg</p>
                      <p className="text-muted-foreground text-xs">a comprar</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <IndustrialButton size="lg" variant="secondary" fullWidth onClick={() => setMode('form')}>
              Voltar
            </IndustrialButton>
            <IndustrialButton size="lg" variant="success" fullWidth onClick={handleConfirmSchedule}
              disabled={submitting}
              icon={<Check className="w-5 h-5" />}>
              {submitting ? 'Salvando...' : 'Confirmar Programação'}
            </IndustrialButton>
          </div>
        </div>
      </div>
    );
  }

  // ── Schedule View ──
  if (mode === 'schedule') {
    return (
      <div className="flex flex-col h-full">
        <div className="bg-card border-b-2 border-border p-4">
          <div className="flex items-center gap-3">
            <div>
              <h1 className="text-xl font-black text-foreground">Programação de Produção</h1>
              <p className="text-muted-foreground text-sm">Planejamento semanal</p>
            </div>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <IndustrialButton size="lg" variant="primary" fullWidth onClick={() => setMode('form')}
            icon={<Factory className="w-5 h-5" />}>
            Nova Programação
          </IndustrialButton>

          {schedules.length === 0 ? (
            <div className="bg-card border rounded-xl px-6 py-12 text-center text-muted-foreground">
              <p>Nenhuma programação registrada.</p>
            </div>
          ) : schedules.map(s => {
            const form = formulations.find(f => f.id === s.formulation_id);
            const mixer = mixers.find(m => m.id === s.mixer_id);
            return (
              <div key={s.id} className={`bg-card border-2 ${s.status === 'confirmed' ? 'border-industrial-success' : 'border-industrial-warning'} rounded-xl p-4`}>
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-foreground font-bold">{form?.name || 'Formulação'} • {mixer?.name || 'Mixer'}</p>
                    <p className="text-muted-foreground text-xs">
                      {s.batches} batidas • {Number(s.total_weight_kg).toFixed(1)} kg
                    </p>
                    <p className="text-muted-foreground text-xs">
                      <Calendar className="w-3 h-3 inline mr-1" />
                      {new Date(s.production_date + 'T12:00:00').toLocaleDateString('pt-BR')}
                      {s.created_by_name && ` • ${s.created_by_name}`}
                    </p>
                  </div>
                  <span className={`px-2 py-1 rounded text-xs font-bold ${
                    s.status === 'confirmed' ? 'bg-industrial-success/20 text-industrial-success' : 'bg-industrial-warning/20 text-industrial-warning'
                  }`}>
                    {s.status === 'confirmed' ? 'Confirmada' : 'Planejada'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // ── Form View ──
  return (
    <div className="flex flex-col h-full">
      <div className="bg-card border-b-2 border-border p-4">
        <div className="flex items-center gap-3">
          <button onClick={() => setMode('schedule')} className="p-2 hover:bg-secondary rounded-lg">
            <ArrowLeft className="w-5 h-5 text-foreground" />
          </button>
          <div>
            <h1 className="text-xl font-black text-foreground">Planejamento de Produção</h1>
            <p className="text-muted-foreground text-sm">Simular e programar produção</p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Formulation */}
        <div>
          <label className="text-foreground font-bold text-sm">Formulação</label>
          <select
            value={selectedFormulationId}
            onChange={(e) => setSelectedFormulationId(e.target.value)}
            className="w-full mt-1 px-3 py-3 bg-input border-2 border-border rounded-lg text-foreground font-bold"
          >
            <option value="">Selecione uma formulação...</option>
            {formulations.map(f => (
              <option key={f.id} value={f.id}>{f.name} ({f.final_product})</option>
            ))}
          </select>
        </div>

        {/* Mixer */}
        <div>
          <label className="text-foreground font-bold text-sm">Misturador</label>
          <select
            value={selectedMixerId}
            onChange={(e) => setSelectedMixerId(e.target.value)}
            className="w-full mt-1 px-3 py-3 bg-input border-2 border-border rounded-lg text-foreground font-bold"
          >
            <option value="">Selecione um misturador...</option>
            {mixers.map(m => (
              <option key={m.id} value={m.id}>
                {m.name} ({m.capacity_kg}kg • máx {m.max_batches_per_day} batidas/dia)
              </option>
            ))}
          </select>
        </div>

        {/* Batches */}
        <div>
          <label className="text-foreground font-bold text-sm">Número de Batidas</label>
          <input
            type="number"
            value={batches}
            onChange={(e) => setBatches(e.target.value)}
            placeholder="0"
            min="1"
            className="w-full mt-1 px-3 py-3 bg-input border-2 border-border rounded-lg text-foreground font-bold text-center"
          />
          {selectedFormulation && batches && (
            <p className="text-muted-foreground text-xs mt-1">
              Total: {(parseInt(batches) * selectedFormulation.weight_per_batch).toFixed(1)} kg
              ({selectedFormulation.weight_per_batch} kg/batida)
            </p>
          )}
        </div>

        {/* Production Date */}
        <div>
          <label className="text-foreground font-bold text-sm">Data de Produção</label>
          <input
            type="date"
            value={productionDate}
            onChange={(e) => setProductionDate(e.target.value)}
            className="w-full mt-1 px-3 py-3 bg-input border-2 border-border rounded-lg text-foreground font-bold"
          />
        </div>

        {/* Mixer capacity warning */}
        {selectedMixer && batches && parseInt(batches) > selectedMixer.max_batches_per_day && (
          <div className="bg-destructive/10 border-2 border-destructive rounded-xl p-3 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-destructive flex-shrink-0 mt-0.5" />
            <p className="text-destructive text-sm font-bold">
              Excede capacidade do misturador! Máximo: {selectedMixer.max_batches_per_day} batidas/dia
            </p>
          </div>
        )}

        {/* Ingredient preview */}
        {selectedFormulationId && formulationItems.length > 0 && batches && (
          <div className="bg-card border-2 border-border rounded-xl p-4 space-y-2">
            <p className="text-muted-foreground text-xs font-bold">INGREDIENTES (PRÉVIA)</p>
            {formulationItems.map(fi => {
              const product = products.find(p => p.id === fi.product_id);
              const idealKg = fi.quantity_per_batch * parseInt(batches || '0');
              const pcpStock = getStock(fi.product_id, 'PCP');
              const available = Number(pcpStock?.total_kg || 0);
              const insufficient = idealKg > available;
              return (
                <div key={fi.id} className="flex justify-between text-sm">
                  <span className={`${insufficient ? 'text-destructive' : 'text-foreground'}`}>
                    {product?.name || fi.product_id}
                    {insufficient && ' ❌'}
                  </span>
                  <span className="text-foreground font-bold">{idealKg.toFixed(1)} kg</span>
                </div>
              );
            })}
          </div>
        )}

        <IndustrialButton size="lg" variant="primary" fullWidth onClick={handleSimulate}
          disabled={!selectedFormulationId || !selectedMixerId || !batches || parseInt(batches) <= 0}
          icon={<Factory className="w-5 h-5" />}>
          Simular Produção
        </IndustrialButton>
      </div>
    </div>
  );
}
