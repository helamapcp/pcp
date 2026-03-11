import React, { useState, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useFormulations, useFormulationItems } from '@/hooks/useProductionData';
import { useMixers } from '@/hooks/useMixers';
import { useProductionPlanning } from '@/hooks/useProductionPlanning';
import { IndustrialButton } from '@/components/IndustrialButton';
import { toast } from 'sonner';
import {
  CalendarDays, Plus, X, Check, Factory, AlertTriangle, ArrowLeft,
} from 'lucide-react';

type Mode = 'list' | 'create';

export default function ManagerPlanning() {
  const { user } = useAuth();
  const { formulations } = useFormulations();
  const { mixers } = useMixers();
  const { plannings, createPlanning, cancelPlanning } = useProductionPlanning();

  const [mode, setMode] = useState<Mode>('list');
  const [formulationId, setFormulationId] = useState('');
  const [mixerId, setMixerId] = useState('');
  const [batchesStr, setBatchesStr] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [cancelId, setCancelId] = useState<string | null>(null);
  const [cancelReason, setCancelReason] = useState('');

  const activeMixers = useMemo(() => mixers.filter(m => m.active), [mixers]);
  const selectedFormulation = formulations.find(f => f.id === formulationId);
  const batches = parseInt(batchesStr) || 0;

  const handleCreate = async () => {
    if (!user || !selectedFormulation || !mixerId || batches <= 0) {
      toast.error('Preencha todos os campos');
      return;
    }
    setSubmitting(true);
    try {
      const { error } = await createPlanning({
        production_date: date,
        formulation_id: formulationId,
        mixer_id: mixerId,
        batches,
        total_weight_kg: batches * selectedFormulation.weight_per_batch,
        notes: notes || undefined,
        created_by: user.id,
        created_by_name: user.fullName,
      });
      if (error) throw error;
      toast.success('Planejamento criado!');
      setMode('list');
      setFormulationId('');
      setMixerId('');
      setBatchesStr('');
      setNotes('');
    } catch (err: any) {
      toast.error('Erro: ' + (err.message || err));
    }
    setSubmitting(false);
  };

  const handleCancel = async () => {
    if (!cancelId || !user || !cancelReason.trim()) {
      toast.error('Informe o motivo do cancelamento');
      return;
    }
    const { error } = await cancelPlanning(cancelId, user.id, user.fullName, cancelReason);
    if (error) toast.error('Erro: ' + error.message);
    else toast.success('Planejamento cancelado');
    setCancelId(null);
    setCancelReason('');
  };

  const statusLabel = (s: string) => {
    switch (s) {
      case 'planned': return { text: 'Planejado', cls: 'bg-amber-500/20 text-amber-600' };
      case 'in_progress': return { text: 'Em Execução', cls: 'bg-primary/20 text-primary' };
      case 'completed': return { text: 'Concluído', cls: 'bg-emerald-500/20 text-emerald-600' };
      case 'cancelled': return { text: 'Cancelado', cls: 'bg-destructive/20 text-destructive' };
      default: return { text: s, cls: 'bg-muted text-muted-foreground' };
    }
  };

  if (mode === 'create') {
    return (
      <div className="p-4 max-w-3xl mx-auto space-y-4">
        <div className="flex items-center gap-3 mb-2">
          <button onClick={() => setMode('list')} className="p-2 hover:bg-secondary rounded-lg">
            <ArrowLeft className="w-5 h-5 text-foreground" />
          </button>
          <h1 className="text-xl font-black text-foreground">Novo Planejamento</h1>
        </div>

        <div className="bg-card border-2 border-border rounded-lg p-4 space-y-4">
          <div>
            <label className="text-foreground font-bold text-sm">Data de Produção</label>
            <input type="date" value={date} onChange={e => setDate(e.target.value)}
              className="w-full mt-1 px-3 py-3 bg-input border-2 border-border rounded-lg text-foreground font-bold" />
          </div>

          <div>
            <label className="text-foreground font-bold text-sm">Formulação</label>
            <select value={formulationId} onChange={e => setFormulationId(e.target.value)}
              className="w-full mt-1 px-3 py-3 bg-input border-2 border-border rounded-lg text-foreground font-bold">
              <option value="">Selecione...</option>
              {formulations.map(f => (
                <option key={f.id} value={f.id}>{f.name} — {f.final_product} ({f.weight_per_batch} kg/batida)</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-foreground font-bold text-sm">Misturador</label>
            <select value={mixerId} onChange={e => setMixerId(e.target.value)}
              className="w-full mt-1 px-3 py-3 bg-input border-2 border-border rounded-lg text-foreground font-bold">
              <option value="">Selecione...</option>
              {activeMixers.map(m => (
                <option key={m.id} value={m.id}>{m.name} — {m.capacity_kg} kg (máx {(m as any).max_batches_per_day} bat/dia)</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-foreground font-bold text-sm">Número de Batidas</label>
            <input type="number" value={batchesStr} onChange={e => setBatchesStr(e.target.value)} min={1}
              className="w-full mt-1 px-3 py-3 bg-input border-2 border-border rounded-lg text-foreground font-bold text-center text-2xl" />
            {selectedFormulation && batches > 0 && (
              <p className="text-muted-foreground text-xs mt-1">
                Total: {(batches * selectedFormulation.weight_per_batch).toFixed(2)} kg
              </p>
            )}
          </div>

          <div>
            <label className="text-foreground font-bold text-sm">Observações (opcional)</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2}
              className="w-full mt-1 px-3 py-2 bg-input border-2 border-border rounded-lg text-foreground text-sm" />
          </div>
        </div>

        <IndustrialButton onClick={handleCreate} disabled={submitting || !formulationId || !mixerId || batches <= 0}
          variant="success" size="lg" className="w-full" icon={<Check className="w-5 h-5" />}>
          {submitting ? 'CRIANDO...' : 'CRIAR PLANEJAMENTO'}
        </IndustrialButton>
      </div>
    );
  }

  // List view
  return (
    <div className="p-4 max-w-3xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-black text-foreground flex items-center gap-2">
          <CalendarDays className="w-5 h-5" /> Planejamento de Produção
        </h1>
        <IndustrialButton onClick={() => setMode('create')} variant="primary" size="sm" icon={<Plus className="w-4 h-4" />}>
          Novo
        </IndustrialButton>
      </div>

      {/* Cancel dialog */}
      {cancelId && (
        <div className="bg-card border-2 border-destructive rounded-lg p-4 space-y-3">
          <p className="text-foreground font-bold text-sm">Motivo do cancelamento:</p>
          <input type="text" value={cancelReason} onChange={e => setCancelReason(e.target.value)}
            placeholder="Ex: Material indisponível..."
            className="w-full px-3 py-2 bg-input border-2 border-border rounded-lg text-foreground text-sm" />
          <div className="flex gap-2">
            <IndustrialButton onClick={handleCancel} variant="danger" size="sm" disabled={!cancelReason.trim()}>Confirmar Cancelamento</IndustrialButton>
            <IndustrialButton onClick={() => { setCancelId(null); setCancelReason(''); }} variant="secondary" size="sm">Voltar</IndustrialButton>
          </div>
        </div>
      )}

      {plannings.length === 0 ? (
        <div className="bg-card border rounded-xl px-6 py-12 text-center text-muted-foreground">
          Nenhum planejamento registrado.
        </div>
      ) : (
        <div className="space-y-3">
          {plannings.map(p => {
            const form = formulations.find(f => f.id === p.formulation_id);
            const mixer = mixers.find(m => m.id === p.mixer_id);
            const st = statusLabel(p.status);
            return (
              <div key={p.id} className="bg-card border-2 border-border rounded-xl p-4">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-foreground font-bold">{form?.name || 'Formulação'}</p>
                    <p className="text-muted-foreground text-xs">
                      {mixer?.name || 'Misturador'} • {p.batches} batidas • {Number(p.total_weight_kg).toFixed(1)} kg
                    </p>
                    <p className="text-muted-foreground text-xs mt-1">
                      📅 {new Date(p.production_date + 'T12:00:00').toLocaleDateString('pt-BR')}
                      {p.created_by_name && ` • Criado por: ${p.created_by_name}`}
                    </p>
                    {p.cancel_reason && (
                      <p className="text-destructive text-xs mt-1">Motivo: {p.cancel_reason}</p>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <span className={`px-2 py-1 rounded text-xs font-bold ${st.cls}`}>{st.text}</span>
                    {p.status === 'planned' && (
                      <button onClick={() => setCancelId(p.id)} className="text-destructive text-xs hover:underline flex items-center gap-1">
                        <X className="w-3 h-3" /> Cancelar
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
