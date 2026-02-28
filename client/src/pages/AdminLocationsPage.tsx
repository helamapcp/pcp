import React, { useState, useCallback, useEffect } from 'react';
import { useLocation } from 'wouter';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { IndustrialButton } from '@/components/IndustrialButton';
import { ArrowLeft, Plus, Edit2, Trash2, MapPin, Power } from 'lucide-react';
import { toast } from 'sonner';

const LOCATION_TYPES = ['CD', 'PCP', 'PMP', 'production', 'warehouse', 'custom'] as const;

interface LocationItem {
  id: string; code: string; name: string; description: string | null;
  sort_order: number; active: boolean; location_type?: string;
}

// Stable modal outside render
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

export default function AdminLocationsPage() {
  const [, setNav] = useLocation();
  const { user } = useAuth();
  const [locations, setLocations] = useState<LocationItem[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ code: '', name: '', description: '', sort_order: '0', location_type: 'warehouse' });

  const fetchLocations = useCallback(async () => {
    const { data } = await supabase.from('locations').select('*').order('sort_order');
    if (data) setLocations(data as any);
  }, []);

  useEffect(() => { fetchLocations(); }, [fetchLocations]);

  if (!user || user.role !== 'admin') { setNav('/login'); return null; }

  const handleSave = async () => {
    if (!form.code || !form.name) { toast.error('Código e nome obrigatórios'); return; }
    const payload: any = {
      code: form.code.toUpperCase(),
      name: form.name,
      description: form.description || null,
      sort_order: parseInt(form.sort_order) || 0,
      location_type: form.location_type,
    };
    if (editingId) {
      await supabase.from('locations').update(payload).eq('id', editingId);
      toast.success('Local atualizado!');
    } else {
      await supabase.from('locations').insert(payload);
      toast.success('Local criado!');
    }
    setShowForm(false); setEditingId(null);
    setForm({ code: '', name: '', description: '', sort_order: '0', location_type: 'warehouse' });
    fetchLocations();
  };

  const handleToggleActive = async (loc: LocationItem) => {
    await supabase.from('locations').update({ active: !loc.active }).eq('id', loc.id);
    toast.success(loc.active ? 'Desativado' : 'Ativado');
    fetchLocations();
  };

  const handleEdit = (loc: LocationItem) => {
    setForm({
      code: loc.code, name: loc.name, description: loc.description || '',
      sort_order: String(loc.sort_order), location_type: (loc as any).location_type || 'warehouse',
    });
    setEditingId(loc.id); setShowForm(true);
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
              <MapPin className="w-5 h-5 text-primary" /> Gestão de Locais
            </h1>
            <p className="text-muted-foreground text-xs">Criar, editar e ativar/desativar locais</p>
          </div>
        </div>
      </div>

      <div className="flex-1 p-4 max-w-3xl mx-auto w-full space-y-4">
        <IndustrialButton size="lg" variant="success" onClick={() => { setEditingId(null); setForm({ code: '', name: '', description: '', sort_order: '0', location_type: 'warehouse' }); setShowForm(true); }} icon={<Plus className="w-5 h-5" />}>
          Novo Local
        </IndustrialButton>

        {showForm && (
          <Modal title={editingId ? '✏️ Editar Local' : '➕ Novo Local'} onClose={() => setShowForm(false)}>
            <div>
              <label className="text-foreground font-bold text-xs mb-1 block">Código</label>
              <input value={form.code} onChange={e => setForm(prev => ({ ...prev, code: e.target.value }))}
                className="w-full px-4 py-3 bg-input border-2 border-border rounded-lg text-foreground font-semibold" placeholder="Ex: CD, PCP" />
            </div>
            <div>
              <label className="text-foreground font-bold text-xs mb-1 block">Nome</label>
              <input value={form.name} onChange={e => setForm(prev => ({ ...prev, name: e.target.value }))}
                className="w-full px-4 py-3 bg-input border-2 border-border rounded-lg text-foreground font-semibold" placeholder="Centro de Distribuição" />
            </div>
            <div>
              <label className="text-foreground font-bold text-xs mb-1 block">Tipo</label>
              <select value={form.location_type} onChange={e => setForm(prev => ({ ...prev, location_type: e.target.value }))}
                className="w-full px-4 py-3 bg-input border-2 border-border rounded-lg text-foreground font-semibold">
                {LOCATION_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="text-foreground font-bold text-xs mb-1 block">Descrição</label>
              <input value={form.description} onChange={e => setForm(prev => ({ ...prev, description: e.target.value }))}
                className="w-full px-4 py-3 bg-input border-2 border-border rounded-lg text-foreground font-semibold" />
            </div>
            <div>
              <label className="text-foreground font-bold text-xs mb-1 block">Ordem</label>
              <input type="text" inputMode="numeric" value={form.sort_order} onChange={e => setForm(prev => ({ ...prev, sort_order: e.target.value }))}
                className="w-full px-4 py-3 bg-input border-2 border-border rounded-lg text-foreground font-semibold" />
            </div>
            <div className="flex gap-3 pt-4">
              <IndustrialButton size="lg" variant="secondary" onClick={() => setShowForm(false)} className="flex-1">Cancelar</IndustrialButton>
              <IndustrialButton size="lg" variant="success" onClick={handleSave} className="flex-1">{editingId ? 'Atualizar' : 'Criar'}</IndustrialButton>
            </div>
          </Modal>
        )}

        <div className="space-y-3">
          {locations.map(loc => (
            <div key={loc.id} className={`bg-card border-2 rounded-lg p-4 flex items-center justify-between ${loc.active ? 'border-border' : 'border-destructive/30 opacity-60'}`}>
              <div>
                <p className="text-foreground font-bold">{loc.name}</p>
                <p className="text-muted-foreground text-xs">
                  Código: <span className="font-bold text-primary">{loc.code}</span> • Ordem: {loc.sort_order}
                  {(loc as any).location_type && ` • Tipo: ${(loc as any).location_type}`}
                </p>
                {loc.description && <p className="text-muted-foreground text-xs">{loc.description}</p>}
              </div>
              <div className="flex gap-2">
                <button onClick={() => handleToggleActive(loc)}
                  className={`p-2 rounded-lg transition-colors touch-target ${loc.active ? 'bg-industrial-success/20 hover:bg-industrial-success/30 text-industrial-success' : 'bg-destructive/20 hover:bg-destructive/30 text-destructive'}`}>
                  <Power className="w-4 h-4" />
                </button>
                <button onClick={() => handleEdit(loc)}
                  className="p-2 bg-primary/80 hover:bg-primary text-primary-foreground rounded-lg transition-colors touch-target">
                  <Edit2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
          {locations.length === 0 && <p className="text-center text-muted-foreground py-8">Nenhum local cadastrado</p>}
        </div>
      </div>
    </div>
  );
}
