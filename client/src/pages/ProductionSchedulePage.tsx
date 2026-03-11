import React, { useMemo } from 'react';
import { useFormulations } from '@/hooks/useProductionData';
import { useIndustrialProducts, useStock } from '@/hooks/useIndustrialData';
import { useMixersPlanning, useProductionSchedules, usePurchaseSuggestions } from '@/hooks/usePlanningData';
import { Calendar, Factory, ShoppingCart, Package, TrendingUp, AlertTriangle } from 'lucide-react';

export default function ProductionSchedulePage() {
  const { formulations } = useFormulations();
  const { products } = useIndustrialProducts();
  const { stock } = useStock();
  const { mixers } = useMixersPlanning();
  const { schedules } = useProductionSchedules();
  const { suggestions } = usePurchaseSuggestions();

  const openSuggestions = suggestions.filter(s => s.status === 'open');

  // Group schedules by date
  const schedulesByDate = useMemo(() => {
    const map = new Map<string, typeof schedules>();
    for (const s of schedules) {
      const list = map.get(s.production_date) || [];
      list.push(s);
      map.set(s.production_date, list);
    }
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [schedules]);

  // Calculate projected stock
  const projectedStock = useMemo(() => {
    const consumption = new Map<string, number>();
    // Sum planned consumption from upcoming schedules
    for (const s of schedules.filter(s => s.status === 'planned')) {
      const form = formulations.find(f => f.id === s.formulation_id);
      if (!form) continue;
      // We'd need formulation items here, simplified for now
    }

    return stock
      .filter(s => s.location_code === 'PCP')
      .map(s => {
        const product = products.find(p => p.id === s.product_id);
        const planned = consumption.get(s.product_id) || 0;
        return {
          product_id: s.product_id,
          product_name: product?.name || 'Desconhecido',
          current_kg: Number(s.total_kg),
          projected_kg: Number(s.total_kg) - planned,
        };
      })
      .filter(s => s.current_kg > 0)
      .sort((a, b) => a.product_name.localeCompare(b.product_name));
  }, [stock, products, schedules, formulations]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Painel de Programação</h1>
        <p className="text-muted-foreground">Visão geral de produção, capacidade e materiais</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-card border rounded-xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <Calendar className="w-4 h-4 text-primary" />
            <p className="text-muted-foreground text-xs">Programações</p>
          </div>
          <p className="text-foreground font-black text-2xl">{schedules.length}</p>
        </div>
        <div className="bg-card border rounded-xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <Factory className="w-4 h-4 text-industrial-success" />
            <p className="text-muted-foreground text-xs">Confirmadas</p>
          </div>
          <p className="text-industrial-success font-black text-2xl">{schedules.filter(s => s.status === 'confirmed').length}</p>
        </div>
        <div className="bg-card border rounded-xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp className="w-4 h-4 text-industrial-warning" />
            <p className="text-muted-foreground text-xs">Planejadas</p>
          </div>
          <p className="text-industrial-warning font-black text-2xl">{schedules.filter(s => s.status === 'planned').length}</p>
        </div>
        <div className="bg-card border rounded-xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <ShoppingCart className="w-4 h-4 text-destructive" />
            <p className="text-muted-foreground text-xs">Compras Pendentes</p>
          </div>
          <p className="text-destructive font-black text-2xl">{openSuggestions.length}</p>
        </div>
      </div>

      {/* Purchase Suggestions */}
      {openSuggestions.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-foreground font-bold flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-destructive" /> Necessidades de Compra
          </h2>
          {openSuggestions.map(s => {
            const product = products.find(p => p.id === s.product_id);
            return (
              <div key={s.id} className="bg-card border-2 border-destructive/30 rounded-lg p-3 flex justify-between">
                <div>
                  <p className="text-foreground font-bold text-sm">{product?.name || 'Produto'}</p>
                  <p className="text-muted-foreground text-xs">
                    Necessário: {Number(s.required_quantity_kg).toFixed(2)} kg • Disponível: {Number(s.available_stock_kg).toFixed(2)} kg
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-destructive font-black">{Number(s.suggested_purchase_kg).toFixed(2)} kg</p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Schedule by Date */}
      <div className="space-y-4">
        <h2 className="text-foreground font-bold">Cronograma</h2>
        {schedulesByDate.length === 0 ? (
          <div className="bg-card border rounded-xl px-6 py-12 text-center text-muted-foreground">
            <p>Nenhuma programação registrada.</p>
          </div>
        ) : schedulesByDate.map(([date, daySchedules]) => (
          <div key={date} className="space-y-2">
            <h3 className="text-muted-foreground text-xs font-bold uppercase">
              {new Date(date + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
            </h3>
            {daySchedules.map(s => {
              const form = formulations.find(f => f.id === s.formulation_id);
              const mixer = mixers.find(m => m.id === s.mixer_id);
              const capacityUsage = mixer ? (s.batches / mixer.max_batches_per_day) * 100 : 0;
              return (
                <div key={s.id} className={`bg-card border-2 ${s.status === 'confirmed' ? 'border-industrial-success' : 'border-border'} rounded-xl p-4`}>
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-foreground font-bold">{form?.name || 'Formulação'}</p>
                      <p className="text-muted-foreground text-xs">
                        {mixer?.name} • {s.batches} batidas • {Number(s.total_weight_kg).toFixed(1)} kg
                      </p>
                    </div>
                    <div className="text-right">
                      <span className={`px-2 py-1 rounded text-xs font-bold ${
                        s.status === 'confirmed' ? 'bg-industrial-success/20 text-industrial-success' : 'bg-industrial-warning/20 text-industrial-warning'
                      }`}>
                        {s.status === 'confirmed' ? 'Confirmada' : 'Planejada'}
                      </span>
                      <p className={`text-xs mt-1 font-bold ${capacityUsage > 100 ? 'text-destructive' : 'text-muted-foreground'}`}>
                        {capacityUsage.toFixed(0)}% capacidade
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {/* Projected Stock */}
      {projectedStock.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-foreground font-bold flex items-center gap-2">
            <Package className="w-4 h-4" /> Estoque Projetado (PCP)
          </h2>
          <div className="bg-card border rounded-xl divide-y divide-border">
            {projectedStock.slice(0, 20).map(s => (
              <div key={s.product_id} className="px-4 py-2 flex justify-between">
                <span className="text-foreground text-sm">{s.product_name}</span>
                <span className={`font-bold text-sm ${s.projected_kg < 0 ? 'text-destructive' : 'text-foreground'}`}>
                  {s.projected_kg.toFixed(1)} kg
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
