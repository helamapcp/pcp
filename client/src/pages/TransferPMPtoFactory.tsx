import React, { useState, useMemo } from 'react';
import { useLocation } from 'wouter';
import { useAuth } from '@/contexts/AuthContext';
import { useStock, useStockMovements } from '@/hooks/useIndustrialData';
import { useProductionBatches } from '@/hooks/useProductionData';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { ArrowLeft, Truck, CheckCircle2, Loader2, Package, AlertTriangle } from 'lucide-react';

export default function TransferPMPtoFactory() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const { stock, refetch: refetchStock } = useStock();
  const { addMovement } = useStockMovements();
  const { batches, refetch: refetchBatches } = useProductionBatches();

  const [selectedBatchId, setSelectedBatchId] = useState('');
  const [quantity, setQuantity] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  // Only completed batches
  const completedBatches = useMemo(() =>
    batches.filter(b => b.status === 'completed'),
    [batches]
  );

  const selectedBatch = useMemo(() =>
    completedBatches.find(b => b.id === selectedBatchId),
    [completedBatches, selectedBatchId]
  );

  // PMP total stock (simplified: we look at total kg in PMP)
  const pmpTotalKg = useMemo(() =>
    stock.filter(s => s.location_code === 'PMP').reduce((sum, s) => sum + Number(s.total_kg), 0),
    [stock]
  );

  const qtyKg = parseFloat(quantity) || 0;
  const canSend = selectedBatch && qtyKg > 0 && qtyKg <= Number(selectedBatch.total_compound_kg);

  const handleConfirm = async () => {
    if (!user || !selectedBatch || !canSend) return;
    setSubmitting(true);

    try {
      // Create transfer PMP → FABRICA
      const { data: transfer, error: tErr } = await supabase
        .from('transfers')
        .insert({
          from_location: 'PMP',
          to_location: 'FABRICA',
          status: 'completed',
          requested_by: user.id,
          requested_by_name: user.fullName,
          confirmed_by: user.id,
          confirmed_by_name: user.fullName,
          confirmed_at: new Date().toISOString(),
          notes: `Envio Fábrica: ${selectedBatch.final_product} (${selectedBatch.machine}) | Lote: ${selectedBatch.batch_code} | ${qtyKg}kg`,
        })
        .select()
        .single();

      if (tErr) throw tErr;

      // Record movements
      // We need a product_id for the movement. Use the first product from the batch's production order items.
      const { data: orderItems } = await supabase
        .from('production_order_items')
        .select('product_id')
        .eq('production_order_id', selectedBatch.production_order_id!)
        .limit(1);

      const refProductId = orderItems?.[0]?.product_id || selectedBatch.formulation_id;

      await addMovement({
        product_id: refProductId,
        location_code: 'PMP',
        movement_type: 'factory_out',
        quantity: qtyKg,
        unit: 'kg',
        total_kg: qtyKg,
        reference_type: 'transfer',
        reference_id: transfer.id,
        notes: `Saída PMP → Fábrica: ${selectedBatch.final_product} | Lote: ${selectedBatch.batch_code} | ${qtyKg}kg`,
        user_id: user.id,
        user_name: user.fullName,
      });

      await addMovement({
        product_id: refProductId,
        location_code: 'FABRICA',
        movement_type: 'factory_in',
        quantity: qtyKg,
        unit: 'kg',
        total_kg: qtyKg,
        reference_type: 'transfer',
        reference_id: transfer.id,
        notes: `Recebimento Fábrica: ${selectedBatch.final_product} | Lote: ${selectedBatch.batch_code} | ${qtyKg}kg`,
        user_id: user.id,
        user_name: user.fullName,
      });

      await refetchStock();
      await refetchBatches();
      toast.success('Transferência para fábrica confirmada!');
      setDone(true);
    } catch (err: any) {
      toast.error('Erro: ' + (err.message || err));
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
              <Truck className="w-5 h-5 text-primary" /> Envio para Fábrica
            </h1>
            <p className="text-muted-foreground text-xs">PMP → Fábrica • Composto</p>
          </div>
        </div>
      </div>

      <div className="flex-1 p-4 max-w-3xl mx-auto w-full">
        {!done ? (
          <div className="space-y-4">
            <div className="bg-card border-2 border-border rounded-lg p-4">
              <p className="text-muted-foreground text-sm mb-4">
                <Package className="w-4 h-4 inline mr-1" />
                Selecione o lote de produção e a quantidade a enviar.
              </p>

              <div className="space-y-2 mb-4">
                <label className="text-foreground font-bold text-sm">Lote de Produção</label>
                <select value={selectedBatchId} onChange={e => setSelectedBatchId(e.target.value)}
                  className="w-full bg-input border-2 border-border rounded-lg p-3 text-foreground font-semibold touch-target">
                  <option value="">Selecione um lote...</option>
                  {completedBatches.map(b => (
                    <option key={b.id} value={b.id}>
                      {b.batch_code || b.id.slice(0, 8)} — {b.final_product} ({b.machine}) — {Number(b.total_compound_kg).toFixed(1)}kg
                    </option>
                  ))}
                </select>
              </div>

              {selectedBatch && (
                <div className="bg-secondary rounded-lg p-3 border border-border mb-4">
                  <p className="text-foreground text-sm font-bold">📦 {selectedBatch.batch_code}</p>
                  <p className="text-muted-foreground text-xs mt-1">
                    {selectedBatch.final_product} • {selectedBatch.machine} • {selectedBatch.batches} batidas
                  </p>
                  <p className="text-primary font-bold text-sm mt-1">
                    {Number(selectedBatch.total_compound_kg).toFixed(1)} kg disponível
                  </p>
                  <p className="text-muted-foreground text-xs mt-1">
                    Produzido por: {selectedBatch.produced_by_name} • {selectedBatch.completed_at ? new Date(selectedBatch.completed_at).toLocaleString('pt-BR') : ''}
                  </p>
                </div>
              )}

              <div className="space-y-2 mb-4">
                <label className="text-foreground font-bold text-sm">Quantidade (kg)</label>
                <input type="number" min={0} step="0.1" value={quantity}
                  onChange={e => setQuantity(e.target.value)}
                  placeholder="0.0"
                  className="w-full bg-input border-2 border-border rounded-lg p-3 text-foreground font-bold text-2xl text-center touch-target" />
                {selectedBatch && qtyKg > Number(selectedBatch.total_compound_kg) && (
                  <p className="text-destructive text-xs flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" /> Excede o total do lote
                  </p>
                )}
              </div>
            </div>

            <button onClick={handleConfirm} disabled={submitting || !canSend}
              className="w-full bg-industrial-success hover:bg-industrial-success/90 text-industrial-success-foreground font-black text-lg py-4 rounded-xl transition-colors touch-target disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
              {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Truck className="w-5 h-5" />}
              {submitting ? 'ENVIANDO...' : 'CONFIRMAR ENVIO'}
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="bg-card border-2 border-industrial-success rounded-lg p-6 text-center">
              <CheckCircle2 className="w-16 h-16 text-industrial-success mx-auto mb-4" />
              <h2 className="text-foreground font-black text-2xl mb-2">Enviado para Fábrica!</h2>
              {selectedBatch && (
                <>
                  <div className="bg-secondary rounded-lg p-3 inline-block mb-3">
                    <p className="text-muted-foreground text-xs">Lote</p>
                    <p className="text-primary font-black text-lg">{selectedBatch.batch_code}</p>
                  </div>
                  <p className="text-muted-foreground">
                    {selectedBatch.final_product} • {qtyKg.toFixed(1)} kg
                  </p>
                </>
              )}
              <p className="text-muted-foreground text-xs mt-2">
                ✅ Transferência PMP→Fábrica registrada • Rastreabilidade completa
              </p>
            </div>

            <div className="flex gap-3">
              <button onClick={() => { setDone(false); setSelectedBatchId(''); setQuantity(''); }}
                className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground font-bold py-4 rounded-xl transition-colors touch-target">
                NOVO ENVIO
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
