import React, { useState, useMemo } from 'react';
import { useLocation } from 'wouter';
import { useAuth } from '@/contexts/AuthContext';
import { useFormulations } from '@/hooks/useProductionData';
import { useProductionBags } from '@/hooks/useProductionPlanning';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Truck, CheckCircle2, Loader2, Package, AlertTriangle } from 'lucide-react';
import { IndustrialButton } from '@/components/IndustrialButton';

export default function TransferPMPtoFactory() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const { formulations } = useFormulations();
  const { bags, markTransferred, refetch: refetchBags } = useProductionBags();

  const [selectedBagIds, setSelectedBagIds] = useState<Set<string>>(new Set());
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [transferredCount, setTransferredCount] = useState(0);
  const [transferredKg, setTransferredKg] = useState(0);

  const availableBags = useMemo(() =>
    bags.filter(b => b.status === 'available' && b.location_code === 'PMP'),
    [bags]
  );

  const toggleBag = (id: string) => {
    setSelectedBagIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    if (selectedBagIds.size === availableBags.length) {
      setSelectedBagIds(new Set());
    } else {
      setSelectedBagIds(new Set(availableBags.map(b => b.id)));
    }
  };

  const selectedBags = useMemo(() =>
    availableBags.filter(b => selectedBagIds.has(b.id)),
    [availableBags, selectedBagIds]
  );

  const totalKg = useMemo(() =>
    selectedBags.reduce((sum, b) => sum + Number(b.weight_kg), 0),
    [selectedBags]
  );

  const handleConfirm = async () => {
    if (!user || selectedBags.length === 0) return;
    setSubmitting(true);

    try {
      // Create transfer record
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
          notes: `Envio Fábrica: ${selectedBags.length} sacas (${totalKg.toFixed(2)} kg)`,
        })
        .select()
        .single();

      if (tErr) throw tErr;

      // Record stock movements for each bag's formulation
      const formMap = new Map<string, number>();
      selectedBags.forEach(b => {
        formMap.set(b.formulation_id, (formMap.get(b.formulation_id) || 0) + Number(b.weight_kg));
      });

      for (const [formId, kg] of formMap.entries()) {
        // PMP out
        await supabase.from('stock_movements').insert({
          product_id: formId, // Using formulation_id as reference
          location_code: 'PMP',
          movement_type: 'factory_out',
          quantity: kg,
          unit: 'kg',
          total_kg: kg,
          reference_type: 'transfer',
          reference_id: transfer.id,
          notes: `Saída PMP → Fábrica: ${selectedBags.length} sacas (${kg.toFixed(2)} kg)`,
          user_id: user.id,
          user_name: user.fullName,
        });

        // Factory in
        await supabase.from('stock_movements').insert({
          product_id: formId,
          location_code: 'FABRICA',
          movement_type: 'factory_in',
          quantity: kg,
          unit: 'kg',
          total_kg: kg,
          reference_type: 'transfer',
          reference_id: transfer.id,
          notes: `Recebimento Fábrica: ${selectedBags.length} sacas (${kg.toFixed(2)} kg)`,
          user_id: user.id,
          user_name: user.fullName,
        });
      }

      // Mark bags as transferred
      await markTransferred(
        Array.from(selectedBagIds),
        transfer.id,
        'FABRICA'
      );

      setTransferredCount(selectedBags.length);
      setTransferredKg(totalKg);
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
    <div className="p-4 max-w-3xl mx-auto w-full">
      {!done ? (
        <div className="space-y-4">
          <div className="bg-card border-2 border-border rounded-lg p-4">
            <p className="text-muted-foreground text-sm mb-4">
              <Package className="w-4 h-4 inline mr-1" />
              Selecione as sacas de composto para enviar à fábrica.
            </p>

            {availableBags.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Package className="w-12 h-12 mx-auto mb-2 opacity-30" />
                <p className="font-bold">Nenhuma saca disponível no PMP</p>
                <p className="text-xs mt-1">Registre sacas na tela de produção primeiro.</p>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between mb-3">
                  <p className="text-foreground font-bold text-sm">Sacas Disponíveis ({availableBags.length})</p>
                  <button onClick={selectAll} className="text-primary text-xs font-bold hover:underline">
                    {selectedBagIds.size === availableBags.length ? 'Desmarcar Tudo' : 'Selecionar Tudo'}
                  </button>
                </div>

                <div className="divide-y divide-border max-h-96 overflow-y-auto border-2 border-border rounded-lg">
                  {availableBags.map(b => {
                    const form = formulations.find(f => f.id === b.formulation_id);
                    const selected = selectedBagIds.has(b.id);
                    return (
                      <button key={b.id} onClick={() => toggleBag(b.id)}
                        className={`w-full p-3 flex justify-between items-center text-left transition-colors ${
                          selected ? 'bg-primary/10' : 'hover:bg-secondary/50'
                        }`}>
                        <div className="flex items-center gap-3">
                          <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                            selected ? 'bg-primary border-primary' : 'border-border'
                          }`}>
                            {selected && <CheckCircle2 className="w-4 h-4 text-primary-foreground" />}
                          </div>
                          <div>
                            <p className="text-foreground text-sm font-bold">Saca #{b.bag_number}</p>
                            <p className="text-muted-foreground text-xs">{form?.name || 'Formulação'}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-primary font-bold text-sm">{Number(b.weight_kg).toFixed(2)} kg</p>
                          <p className="text-muted-foreground text-xs">{new Date(b.created_at).toLocaleDateString('pt-BR')}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>

                {selectedBags.length > 0 && (
                  <div className="bg-secondary rounded-lg p-3 border border-border mt-3">
                    <p className="text-foreground text-sm font-bold">Resumo da Transferência</p>
                    <p className="text-muted-foreground text-xs mt-1">
                      {selectedBags.length} sacas • <span className="text-primary font-bold">{totalKg.toFixed(1)} kg total</span>
                    </p>
                  </div>
                )}
              </>
            )}
          </div>

          <IndustrialButton onClick={handleConfirm} disabled={submitting || selectedBags.length === 0}
            variant="success" size="lg" className="w-full"
            icon={submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Truck className="w-5 h-5" />}>
            {submitting ? 'ENVIANDO...' : `CONFIRMAR ENVIO (${selectedBags.length} sacas)`}
          </IndustrialButton>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="bg-card border-2 border-emerald-500 rounded-lg p-6 text-center">
            <CheckCircle2 className="w-16 h-16 text-emerald-500 mx-auto mb-4" />
            <h2 className="text-foreground font-black text-2xl mb-2">Enviado para Fábrica!</h2>
            <p className="text-muted-foreground">
              {transferredCount} sacas • {transferredKg.toFixed(1)} kg
            </p>
            <p className="text-muted-foreground text-xs mt-2">
              ✅ Transferência PMP→Fábrica • Rastreabilidade por sacas
            </p>
          </div>

          <div className="flex gap-3">
            <IndustrialButton onClick={() => { setDone(false); setSelectedBagIds(new Set()); }}
              variant="primary" size="lg" className="flex-1">NOVO ENVIO</IndustrialButton>
            <IndustrialButton onClick={() => setLocation('/operator')}
              variant="secondary" size="lg" className="flex-1">VOLTAR</IndustrialButton>
          </div>
        </div>
      )}
    </div>
  );
}
