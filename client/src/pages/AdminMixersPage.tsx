import React, { useState } from 'react';
import { useLocation } from 'wouter';
import { useAuth } from '@/contexts/AuthContext';
import { useMixers } from '@/hooks/useMixers';
import { IndustrialButton } from '@/components/IndustrialButton';
import { ArrowLeft, Plus, Edit2, Power, Settings2 } from 'lucide-react';
import { toast } from 'sonner';

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-card border-2 border-primary rounded-2xl w-full max-w-md shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="bg-secondary px-6 py-5 border-b-2 border-border flex justify-between items-center sticky top-0">
          <h2 className="text-xl font-bold text-foreground">{title}</h2>
          <button onClick={onClose} className="p-2 hover:bg-accent rounded-lg">✕</button>
        </div>
        <div className="p-6 space-y-4">{children}</div>
      </div>
    </div>
  );
}

export default function AdminMixersPage() {
  const [, setNav] = useLocation();
  const { user } = useAuth();
  const { mixers, createMixer, updateMixer, toggleActive } = useMixers();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', capacity_kg: '', production_line: '' });

  if (!user || user.role !== 'admin') { setNav('/login'); return null; }

  const handleSave = async () => {
    if (!form.name) { toast.error('Nome obrigatório'); return; }
    const payload = { name: form.name, capacity_kg: parseFloat(form.capacity_kg) || 0, production_line: form.production_line || undefined };
    if (editingId) {
      await updateMixer(editingId, payload);
      toast.success('Misturador atualizado!');
    } else {
      await createMixer(payload);
      toast.success('Misturador criado!');
    }
    setShowForm(false); setEditingId(null);
    setForm({ name: '', capacity_kg: '', production_line: '' });
  };

  const handleEdit = (m: typeof mixers[0]) => {
    setForm({ name: m.name, capacity_kg: String(m.capacity_kg), production_line: m.production_line || '' });
    setEditingId(m.id); setShowForm(true);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="bg-card border-b-2 border-border sticky top-0 z-10 p-4">
        <div className="flex items-center gap-3">
          <button onClick={() => setNav('/admin')} className="p-2 bg-secondary hover:bg-secondary/80 rounded-lg transition-colors touch-target">
            <ArrowLeft className="w-5 h-5 text-foreground" />
          </button>
          <div>
            <h1 className="text-xl font-black text-foreground flex items-center gap-2">
              <Settings2 className="w-5 h-5 text-primary" /> Gestão de Misturadores
            </h1>
            <p className="text-muted-foreground text-xs">Adicionar, editar e gerenciar máquinas</p>
          </div>
        </div>
      </div>

      <div className="flex-1 p-4 max-w-3xl mx-auto w-full space-y-4">
        <IndustrialButton size="lg" variant="success" onClick={() => { setEditingId(null); setForm({ name: '', capacity_kg: '', production_line: '' }); setShowForm(true); }} icon={<Plus className="w-5 h-5" />}>
          Novo Misturador
        </IndustrialButton>

        {showForm && (
          <Modal title={editingId ? '✏️ Editar Misturador' : '➕ Novo Misturador'} onClose={() => setShowForm(false)}>
            <div>
              <label className="text-foreground font-bold text-xs mb-1 block">Nome</label>
              <input value={form.name} onChange={e => setForm(prev => ({ ...prev, name: e.target.value }))}
                className="w-full px-4 py-3 bg-input border-2 border-border rounded-lg text-foreground font-semibold" placeholder="Ex: Misturador 1" />
            </div>
            <div>
              <label className="text-foreground font-bold text-xs mb-1 block">Capacidade (kg/batida)</label>
              <input type="text" inputMode="decimal" value={form.capacity_kg} onChange={e => setForm(prev => ({ ...prev, capacity_kg: e.target.value }))}
                className="w-full px-4 py-3 bg-input border-2 border-border rounded-lg text-foreground font-semibold" placeholder="500" />
            </div>
            <div>
              <label className="text-foreground font-bold text-xs mb-1 block">Linha de Produção</label>
              <input value={form.production_line} onChange={e => setForm(prev => ({ ...prev, production_line: e.target.value }))}
                className="w-full px-4 py-3 bg-input border-2 border-border rounded-lg text-foreground font-semibold" placeholder="Linha A" />
            </div>
            <div className="flex gap-3 pt-4">
              <IndustrialButton size="lg" variant="secondary" onClick={() => setShowForm(false)} className="flex-1">Cancelar</IndustrialButton>
              <IndustrialButton size="lg" variant="success" onClick={handleSave} className="flex-1">{editingId ? 'Atualizar' : 'Criar'}</IndustrialButton>
            </div>
          </Modal>
        )}

        <div className="space-y-3">
          {mixers.map(m => (
            <div key={m.id} className={`bg-card border-2 rounded-lg p-4 flex items-center justify-between ${m.active ? 'border-border' : 'border-destructive/30 opacity-60'}`}>
              <div>
                <p className="text-foreground font-bold">{m.name}</p>
                <p className="text-muted-foreground text-xs">
                  Capacidade: <span className="font-bold text-primary">{m.capacity_kg} kg</span>
                  {m.production_line && ` • Linha: ${m.production_line}`}
                </p>
              </div>
              <div className="flex gap-2">
                <button onClick={async () => { await toggleActive(m.id, !m.active); toast.success(m.active ? 'Desativado' : 'Ativado'); }}
                  className={`p-2 rounded-lg transition-colors touch-target ${m.active ? 'bg-industrial-success/20 hover:bg-industrial-success/30 text-industrial-success' : 'bg-destructive/20 hover:bg-destructive/30 text-destructive'}`}>
                  <Power className="w-4 h-4" />
                </button>
                <button onClick={() => handleEdit(m)}
                  className="p-2 bg-primary/80 hover:bg-primary text-primary-foreground rounded-lg transition-colors touch-target">
                  <Edit2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
          {mixers.length === 0 && <p className="text-center text-muted-foreground py-8">Nenhum misturador cadastrado</p>}
        </div>
      </div>
    </div>
  );
}
