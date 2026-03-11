import React, { useState, useMemo } from 'react';
import { useLocation } from 'wouter';
import { useAuth } from '@/contexts/AuthContext';
import { useFormulations } from '@/hooks/useProductionData';
import { useProductionBags } from '@/hooks/useProductionPlanning';
import { IndustrialButton } from '@/components/IndustrialButton';
import { toast } from 'sonner';
import { Package, CheckCircle2, Plus } from 'lucide-react';

export default function ProductionBagsPage() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const { formulations } = useFormulations();
  const { bags, createBags } = useProductionBags();

  const [formulationId, setFormulationId] = useState('');
  const [countStr, setCountStr] = useState('');
  const [weightStr, setWeightStr] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const selectedFormulation = formulations.find(f => f.id === formulationId);
  const count = parseInt(countStr) || 0;
  const weight = parseFloat(weightStr) || 0;

  const availableBags = useMemo(() => bags.filter(b => b.status === 'available'), [bags]);

  const handleCreate = async () => {
    if (!user || !formulationId || count <= 0 || weight <= 0) {
      toast.error('Preencha todos os campos');
      return;
    }
    setSubmitting(true);
    try {
      const { error } = await createBags({
        formulation_id: formulationId,
        count,
        weight_kg: weight,
        created_by: user.id,
        created_by_name: user.fullName,
      });
      if (error) throw error;
      toast.success(`${count} sacas registradas!`);
      setDone(true);
    } catch (err: any) {
      toast.error('Erro: ' + (err.message || err));
    }
    setSubmitting(false);
  };

  if (!user) return null;

  return (
    <div className="p-4 max-w-3xl mx-auto space-y-4">
      {!done ? (
        <>
          <div className="bg-card border-2 border-border rounded-lg p-4 space-y-4">
            <p className="text-muted-foreground text-sm flex items-center gap-1">
              <Package className="w-4 h-4" />
              Registre as sacas de composto produzido.
            </p>

            <div>
              <label className="text-foreground font-bold text-sm">Formulação</label>
              <select value={formulationId} onChange={e => setFormulationId(e.target.value)}
                className="w-full mt-1 px-3 py-3 bg-input border-2 border-border rounded-lg text-foreground font-bold">
                <option value="">Selecione...</option>
                {formulations.map(f => (
                  <option key={f.id} value={f.id}>{f.name} — {f.final_product}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-foreground font-bold text-sm">Número de Sacas</label>
              <input type="number" min={1} value={countStr} onChange={e => setCountStr(e.target.value)}
                className="w-full mt-1 px-3 py-3 bg-input border-2 border-border rounded-lg text-foreground font-bold text-center text-2xl" />
            </div>

            <div>
              <label className="text-foreground font-bold text-sm">Peso por Saca (kg)</label>
              <input type="number" min={1} step="0.1" value={weightStr} onChange={e => setWeightStr(e.target.value)}
                className="w-full mt-1 px-3 py-3 bg-input border-2 border-border rounded-lg text-foreground font-bold text-center text-2xl" />
            </div>

            {count > 0 && weight > 0 && (
              <div className="bg-secondary rounded-lg p-3 border border-border">
                <p className="text-foreground text-sm font-bold">Resumo</p>
                <p className="text-muted-foreground text-xs mt-1">
                  {count} sacas × {weight} kg = <span className="text-primary font-bold">{(count * weight).toFixed(2)} kg total</span>
                </p>
              </div>
            )}
          </div>

          <IndustrialButton onClick={handleCreate} disabled={submitting || count <= 0 || weight <= 0 || !formulationId}
            variant="success" size="lg" className="w-full" icon={<Plus className="w-5 h-5" />}>
            {submitting ? 'REGISTRANDO...' : 'REGISTRAR SACAS'}
          </IndustrialButton>

          {/* Available bags */}
          {availableBags.length > 0 && (
            <div className="bg-card border-2 border-border rounded-lg overflow-hidden">
              <div className="px-4 py-3 bg-secondary border-b-2 border-border">
                <h3 className="text-foreground font-bold text-sm">Sacas Disponíveis no PMP ({availableBags.length})</h3>
              </div>
              <div className="divide-y divide-border max-h-64 overflow-y-auto">
                {availableBags.slice(0, 50).map(b => {
                  const form = formulations.find(f => f.id === b.formulation_id);
                  return (
                    <div key={b.id} className="p-3 flex justify-between items-center">
                      <div>
                        <p className="text-foreground text-sm font-bold">Saca #{b.bag_number}</p>
                        <p className="text-muted-foreground text-xs">{form?.name || 'Formulação'}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-primary font-bold text-sm">{Number(b.weight_kg).toFixed(1)} kg</p>
                        <p className="text-muted-foreground text-xs">{new Date(b.created_at).toLocaleDateString('pt-BR')}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="space-y-4">
          <div className="bg-card border-2 border-emerald-500 rounded-lg p-6 text-center">
            <CheckCircle2 className="w-16 h-16 text-emerald-500 mx-auto mb-4" />
            <h2 className="text-foreground font-black text-2xl mb-2">Sacas Registradas!</h2>
            <p className="text-muted-foreground">
              {count} sacas × {weight} kg = {(count * weight).toFixed(1)} kg
            </p>
            <p className="text-muted-foreground text-xs mt-2">Local: PMP • Status: Disponível</p>
          </div>
          <div className="flex gap-3">
            <IndustrialButton onClick={() => { setDone(false); setFormulationId(''); setCountStr(''); setWeightStr(''); }}
              variant="primary" size="lg" className="flex-1">NOVAS SACAS</IndustrialButton>
            <IndustrialButton onClick={() => setLocation('/operator')}
              variant="secondary" size="lg" className="flex-1">VOLTAR</IndustrialButton>
          </div>
        </div>
      )}
    </div>
  );
}
