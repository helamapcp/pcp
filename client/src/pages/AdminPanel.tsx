import React, { useState, useEffect, useCallback } from 'react';
import { useLocation } from 'wouter';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { IndustrialButton } from '@/components/IndustrialButton';
import { useMixers } from '@/hooks/useMixers';
import { X, Plus, Trash2, Edit2, LogOut, Loader2, Save } from 'lucide-react';
import { toast } from 'sonner';

type AppRole = 'admin' | 'gerente' | 'operador';

// ── Stable sub-components (OUTSIDE render to prevent remounting) ──
function AdminModal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-card border-2 border-primary rounded-2xl w-full max-w-md shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="bg-secondary px-6 py-5 border-b-2 border-border flex justify-between items-center sticky top-0">
          <h2 className="text-xl font-bold text-foreground">{title}</h2>
          <button onClick={onClose} className="p-2 hover:bg-accent rounded-lg touch-target"><X className="w-6 h-6 text-foreground" /></button>
        </div>
        <div className="p-6 space-y-4">{children}</div>
      </div>
    </div>
  );
}

function AdminInput({ label, ...props }: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div>
      <label className="text-foreground font-bold text-xs mb-1 block">{label}</label>
      <input {...props} className="w-full px-4 py-3 bg-input border-2 border-border rounded-lg text-foreground placeholder-muted-foreground font-semibold touch-target" />
    </div>
  );
}

function AdminSelect({ label, children, ...props }: { label: string } & React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div>
      <label className="text-foreground font-bold text-xs mb-1 block">{label}</label>
      <select {...props} className="w-full px-4 py-3 bg-input border-2 border-border rounded-lg text-foreground font-semibold touch-target">{children}</select>
    </div>
  );
}

// Sub-component for loading formulation items on demand
function FormulationItemsList({ formulationId, products, getCategoryName, onDelete }: {
  formulationId: string;
  products: { id: string; name: string; category_id: string | null }[];
  getCategoryName: (id: string | null) => string;
  onDelete: (id: string, formulationId: string) => void;
}) {
  const [items, setItems] = useState<{ id: string; product_id: string; quantity_per_batch: number; unit: string }[]>([]);
  const [loaded, setLoaded] = useState(false);

  const load = useCallback(async () => {
    const { data } = await supabase.from('formulation_items').select('*').eq('formulation_id', formulationId);
    if (data) setItems(data as any);
    setLoaded(true);
  }, [formulationId]);

  if (!loaded) {
    return (
      <div className="px-4 py-2">
        <button onClick={load} className="text-primary text-xs font-bold hover:underline">
          Carregar itens...
        </button>
      </div>
    );
  }

  if (items.length === 0) return <div className="px-4 py-2 text-muted-foreground text-xs">Nenhum item</div>;

  return (
    <div className="divide-y divide-border">
      {items.map(item => {
        const product = products.find(p => p.id === item.product_id);
        return (
          <div key={item.id} className="px-4 py-2 flex items-center justify-between">
            <div>
              <p className="text-foreground text-sm font-semibold">{product?.name || item.product_id}</p>
              <p className="text-muted-foreground text-xs">{item.quantity_per_batch} {item.unit}/batida</p>
            </div>
            <button onClick={() => onDelete(item.id, formulationId)}
              className="p-1 bg-destructive/80 hover:bg-destructive text-destructive-foreground rounded transition-colors">
              <Trash2 className="w-3 h-3" />
            </button>
          </div>
        );
      })}
    </div>
  );
}

interface UserItem { id: string; username: string; full_name: string; role: AppRole; created_at: string; }
interface CategoryItem { id: string; name: string; }
interface ProductItem {
  id: string; name: string; category_id: string | null; unit_weight_kg: number;
  base_unit: string; conversion_factor: number; package_type: string; package_weight: number;
}
interface FormulationItem { id: string; name: string; final_product: string; machine: string; weight_per_batch: number; active: boolean; }
interface FormulationDetail { id: string; formulation_id: string; product_id: string; quantity_per_batch: number; unit: string; }
interface LocationItem { id: string; code: string; name: string; description: string | null; sort_order: number; active: boolean; }

export default function AdminPanel() {
  const [, setLocation] = useLocation();
  const { user, signOut } = useAuth();

  const [activeTab, setActiveTab] = useState<'users' | 'products' | 'formulations' | 'locations' | 'stock-adjust'>('users');

  // Users
  const [users, setUsers] = useState<UserItem[]>([]);
  const [showUserForm, setShowUserForm] = useState(false);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [userFormData, setUserFormData] = useState({ name: '', username: '', email: '', password: '', role: 'operador' as AppRole });
  const [userLoading, setUserLoading] = useState(false);

  // Categories
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [showCategoryForm, setShowCategoryForm] = useState(false);
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [categoryFormData, setCategoryFormData] = useState('');

  // Products
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [showProductForm, setShowProductForm] = useState(false);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [productFormData, setProductFormData] = useState({
    name: '', category_id: '', unit_weight_kg: '', base_unit: 'kg',
    conversion_factor: '1', package_type: 'bulk', package_weight: '0',
  });

  // Formulations
  const [formulations, setFormulations] = useState<FormulationItem[]>([]);
  const [showFormulationForm, setShowFormulationForm] = useState(false);
  const [editingFormulationId, setEditingFormulationId] = useState<string | null>(null);
  const [formulationFormData, setFormulationFormData] = useState({
    name: '', final_product: '', machine: '', weight_per_batch: '',
  });
  const [formulationDetails, setFormulationDetails] = useState<FormulationDetail[]>([]);
  const [showDetailForm, setShowDetailForm] = useState<string | null>(null);
  const [detailFormData, setDetailFormData] = useState({ product_id: '', quantity_per_batch: '' });

  // Locations
  const [locations, setLocations] = useState<LocationItem[]>([]);

  // Mixers
  const { mixers } = useMixers();

  const handleLogout = async () => { await signOut(); setLocation('/login'); };

  const fetchUsers = useCallback(async () => {
    const { data, error } = await supabase.functions.invoke('manage-users', { body: { action: 'list' } });
    if (!error && data?.users) setUsers(data.users);
  }, []);
  const fetchCategories = useCallback(async () => {
    const { data } = await supabase.from('categories').select('*').order('name');
    if (data) setCategories(data);
  }, []);
  const fetchProducts = useCallback(async () => {
    const { data } = await supabase.from('products').select('*').order('name');
    if (data) setProducts(data as unknown as ProductItem[]);
  }, []);
  const fetchFormulations = useCallback(async () => {
    const { data } = await supabase.from('formulations').select('*').order('name');
    if (data) setFormulations(data as unknown as FormulationItem[]);
  }, []);
  const fetchFormulationDetails = useCallback(async (formulationId: string) => {
    const { data } = await supabase.from('formulation_items').select('*').eq('formulation_id', formulationId);
    if (data) setFormulationDetails(data as unknown as FormulationDetail[]);
  }, []);
  const fetchLocations = useCallback(async () => {
    const { data } = await supabase.from('locations').select('*').order('sort_order');
    if (data) setLocations(data as unknown as LocationItem[]);
  }, []);

  useEffect(() => {
    fetchUsers(); fetchCategories(); fetchProducts(); fetchFormulations(); fetchLocations();
  }, [fetchUsers, fetchCategories, fetchProducts, fetchFormulations, fetchLocations]);

  if (!user || user.role !== 'admin') { setLocation('/login'); return null; }

  // ── USER HANDLERS ──
  const handleAddUser = async () => {
    if (!userFormData.name || !userFormData.email || !userFormData.password) {
      toast.error('Preencha Nome, E-mail e Senha'); return;
    }
    if (userFormData.password.length < 6) { toast.error('Senha mínima: 6 caracteres'); return; }
    setUserLoading(true);
    try {
      const body: any = {
        action: editingUserId ? 'update' : 'create',
        username: userFormData.username || userFormData.email.split('@')[0],
        full_name: userFormData.name, email: userFormData.email,
        password: userFormData.password, role: userFormData.role,
      };
      if (editingUserId) body.userId = editingUserId;
      const { data, error } = await supabase.functions.invoke('manage-users', { body });
      if (error) { toast.error(error.message); }
      else if (data?.error) { toast.error(data.error); }
      else {
        toast.success(editingUserId ? 'Usuário atualizado!' : 'Usuário criado!');
        setShowUserForm(false); setEditingUserId(null);
        setUserFormData({ name: '', username: '', email: '', password: '', role: 'operador' });
        fetchUsers();
      }
    } catch { toast.error('Erro inesperado'); }
    setUserLoading(false);
  };
  const handleDeleteUser = async (userId: string) => {
    if (!confirm('Remover usuário?')) return;
    const { data, error } = await supabase.functions.invoke('manage-users', { body: { action: 'delete', userId } });
    if (error || data?.error) toast.error(data?.error || 'Erro');
    else { toast.success('Removido'); fetchUsers(); }
  };

  // ── PRODUCT HANDLERS ──
  const handleSaveProduct = async () => {
    if (!productFormData.name || !productFormData.category_id) { toast.error('Preencha nome e categoria'); return; }
    const payload = {
      name: productFormData.name,
      category_id: productFormData.category_id,
      unit_weight_kg: parseFloat(productFormData.unit_weight_kg) || 0,
      base_unit: productFormData.base_unit,
      conversion_factor: parseFloat(productFormData.conversion_factor) || 1,
      package_type: productFormData.package_type,
      package_weight: parseFloat(productFormData.package_weight) || 0,
    };
    if (editingProductId) {
      await supabase.from('products').update(payload).eq('id', editingProductId);
      toast.success('Produto atualizado!');
    } else {
      await supabase.from('products').insert(payload);
      toast.success('Produto criado!');
    }
    setShowProductForm(false); setEditingProductId(null);
    setProductFormData({ name: '', category_id: '', unit_weight_kg: '', base_unit: 'kg', conversion_factor: '1', package_type: 'bulk', package_weight: '0' });
    fetchProducts();
  };
  const handleEditProduct = (p: ProductItem) => {
    setProductFormData({
      name: p.name, category_id: p.category_id || '',
      unit_weight_kg: String(p.unit_weight_kg), base_unit: p.base_unit,
      conversion_factor: String(p.conversion_factor), package_type: p.package_type,
      package_weight: String(p.package_weight),
    });
    setEditingProductId(p.id); setShowProductForm(true);
  };
  const handleDeleteProduct = async (id: string) => {
    await supabase.from('products').delete().eq('id', id);
    toast.success('Produto removido'); fetchProducts();
  };

  // ── CATEGORY HANDLERS ──
  const handleSaveCategory = async () => {
    if (!categoryFormData.trim()) return;
    if (editingCategoryId) {
      await supabase.from('categories').update({ name: categoryFormData }).eq('id', editingCategoryId);
    } else {
      await supabase.from('categories').insert({ name: categoryFormData });
    }
    toast.success(editingCategoryId ? 'Atualizada!' : 'Criada!');
    setCategoryFormData(''); setShowCategoryForm(false); setEditingCategoryId(null);
    fetchCategories(); fetchProducts();
  };
  const handleDeleteCategory = async (id: string) => {
    await supabase.from('categories').delete().eq('id', id);
    toast.success('Removida'); fetchCategories();
  };

  // ── FORMULATION HANDLERS ──
  const handleSaveFormulation = async () => {
    if (!formulationFormData.name || !formulationFormData.final_product || !formulationFormData.machine) {
      toast.error('Preencha todos os campos'); return;
    }
    const payload = {
      name: formulationFormData.name,
      final_product: formulationFormData.final_product,
      machine: formulationFormData.machine,
      weight_per_batch: parseFloat(formulationFormData.weight_per_batch) || 0,
    };
    if (editingFormulationId) {
      await supabase.from('formulations').update(payload).eq('id', editingFormulationId);
      toast.success('Formulação atualizada!');
    } else {
      await supabase.from('formulations').insert(payload);
      toast.success('Formulação criada!');
    }
    setShowFormulationForm(false); setEditingFormulationId(null);
    setFormulationFormData({ name: '', final_product: '', machine: '', weight_per_batch: '' });
    fetchFormulations();
  };
  const handleEditFormulation = (f: FormulationItem) => {
    setFormulationFormData({
      name: f.name, final_product: f.final_product,
      machine: f.machine, weight_per_batch: String(f.weight_per_batch),
    });
    setEditingFormulationId(f.id); setShowFormulationForm(true);
  };
  const handleDeleteFormulation = async (id: string) => {
    await supabase.from('formulation_items').delete().eq('formulation_id', id);
    await supabase.from('formulations').delete().eq('id', id);
    toast.success('Removida'); fetchFormulations();
  };
  const handleAddFormulationItem = async () => {
    if (!showDetailForm || !detailFormData.product_id || !detailFormData.quantity_per_batch) return;
    await supabase.from('formulation_items').insert({
      formulation_id: showDetailForm,
      product_id: detailFormData.product_id,
      quantity_per_batch: parseFloat(detailFormData.quantity_per_batch) || 0,
    });
    toast.success('Item adicionado!');
    setDetailFormData({ product_id: '', quantity_per_batch: '' });
    fetchFormulationDetails(showDetailForm);
  };
  const handleDeleteFormulationItem = async (id: string, formulationId: string) => {
    await supabase.from('formulation_items').delete().eq('id', id);
    toast.success('Removido'); fetchFormulationDetails(formulationId);
  };

  const getCategoryName = (catId: string | null) => categories.find(c => c.id === catId)?.name || 'Sem Categoria';
  const getProductName = (pid: string) => products.find(p => p.id === pid)?.name || pid;

  const getRoleLabel = (r: AppRole) => ({ admin: '🔐 Admin', gerente: '👔 Gerente', operador: '👷 Operador' }[r]);
  const getRoleColor = (r: AppRole) => ({
    admin: 'bg-destructive/20 text-destructive border-destructive/50',
    gerente: 'bg-primary/20 text-primary border-primary/50',
    operador: 'bg-industrial-success/20 text-industrial-success border-industrial-success/50',
  }[r]);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="bg-card border-b-2 border-border sticky top-0 z-10 p-4">
        <div className="flex justify-between items-center max-w-7xl mx-auto">
          <div>
            <h1 className="text-2xl md:text-3xl font-black text-foreground">🔐 Super Admin</h1>
            <p className="text-muted-foreground text-sm">{user.fullName} • Configurações do Sistema</p>
          </div>
          <button onClick={handleLogout} className="p-3 bg-destructive hover:bg-destructive/90 text-destructive-foreground rounded-lg transition-colors touch-target" title="Sair">
            <LogOut className="w-6 h-6" />
          </button>
        </div>
      </div>

      <div className="flex gap-1 border-b-2 border-border bg-card/50 px-2 overflow-x-auto">
        {([
          { id: 'users' as const, label: '👥 Usuários' },
          { id: 'products' as const, label: '📦 Produtos' },
          { id: 'formulations' as const, label: '🧪 Formulações' },
          { id: 'locations' as const, label: '📍 Locais' },
          { id: 'stock-adjust' as const, label: '⚖️ Ajuste Estoque' },
        ]).map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={`px-5 py-4 font-bold transition-colors whitespace-nowrap touch-target ${
              activeTab === tab.id ? 'text-primary border-b-3 border-primary' : 'text-muted-foreground hover:text-foreground'
            }`}>{tab.label}</button>
        ))}
      </div>

      {/* Quick links */}
      <div className="flex gap-2 px-4 pt-4 overflow-x-auto max-w-7xl mx-auto w-full">
        <button onClick={() => setLocation('/admin/locations')} className="px-3 py-2 bg-primary/10 hover:bg-primary/20 text-primary rounded-lg text-xs font-bold whitespace-nowrap">📍 Gestão Locais</button>
        <button onClick={() => setLocation('/admin/mixers')} className="px-3 py-2 bg-primary/10 hover:bg-primary/20 text-primary rounded-lg text-xs font-bold whitespace-nowrap">⚙️ Misturadores</button>
        <button onClick={() => setLocation('/dashboard/executive')} className="px-3 py-2 bg-primary/10 hover:bg-primary/20 text-primary rounded-lg text-xs font-bold whitespace-nowrap">📊 Dashboard Executivo</button>
      </div>

      <div className="flex-1 p-4 md:p-6 overflow-y-auto max-w-7xl mx-auto w-full">

        {/* ═══ USERS ═══ */}
        {activeTab === 'users' && (
          <div>
            <div className="mb-6">
              <IndustrialButton size="lg" variant="success" onClick={() => { setEditingUserId(null); setUserFormData({ name: '', username: '', email: '', password: '', role: 'operador' }); setShowUserForm(true); }} icon={<Plus className="w-6 h-6" />}>
                Adicionar Usuário
              </IndustrialButton>
            </div>

            {showUserForm && (
              <AdminModal title={editingUserId ? '✏️ Editar Usuário' : '➕ Novo Usuário'} onClose={() => { setShowUserForm(false); setEditingUserId(null); }}>
                <AdminInput label="Nome Completo" value={userFormData.name} onChange={e => setUserFormData(prev => ({ ...prev, name: e.target.value }))} />
                <AdminInput label="Username" value={userFormData.username} onChange={e => setUserFormData(prev => ({ ...prev, username: e.target.value }))} />
                <AdminInput label="E-mail" type="email" value={userFormData.email} onChange={e => setUserFormData(prev => ({ ...prev, email: e.target.value }))} />
                <AdminInput label="Senha" type="password" value={userFormData.password} onChange={e => setUserFormData(prev => ({ ...prev, password: e.target.value }))} />
                <div className="grid grid-cols-3 gap-2">
                  {(['operador', 'gerente', 'admin'] as AppRole[]).map(role => (
                    <button key={role} onClick={() => setUserFormData(prev => ({ ...prev, role }))}
                      className={`px-3 py-3 rounded-lg font-bold transition-all border-2 text-sm touch-target ${
                        userFormData.role === role ? 'bg-primary text-primary-foreground border-primary' : 'bg-card text-secondary-foreground border-border hover:bg-secondary'
                      }`}>{getRoleLabel(role)?.split(' ')[1]}</button>
                  ))}
                </div>
                <div className="flex gap-3 pt-4">
                  <IndustrialButton size="lg" variant="secondary" onClick={() => setShowUserForm(false)} className="flex-1">Cancelar</IndustrialButton>
                  <IndustrialButton size="lg" variant="success" onClick={handleAddUser} disabled={userLoading} className="flex-1">
                    {userLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : editingUserId ? 'Atualizar' : 'Criar'}
                  </IndustrialButton>
                </div>
              </AdminModal>
            )}

            <div className="space-y-3">
              {users.map(u => (
                <div key={u.id} className="bg-card border-2 border-border rounded-lg p-4 flex items-center justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-foreground font-bold truncate">{u.full_name}</p>
                    <p className="text-muted-foreground text-sm">@{u.username}</p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-bold border ${getRoleColor(u.role)} whitespace-nowrap`}>{getRoleLabel(u.role)}</span>
                  <div className="flex gap-2">
                    <button onClick={() => { setUserFormData({ name: u.full_name, username: u.username, email: '', password: '', role: u.role }); setEditingUserId(u.id); setShowUserForm(true); }}
                      className="p-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg transition-colors touch-target"><Edit2 className="w-5 h-5" /></button>
                    <button onClick={() => handleDeleteUser(u.id)}
                      className="p-2 bg-destructive hover:bg-destructive/90 text-destructive-foreground rounded-lg transition-colors disabled:opacity-50 touch-target"
                      disabled={u.id === user.id}><Trash2 className="w-5 h-5" /></button>
                  </div>
                </div>
              ))}
              {users.length === 0 && <p className="text-center text-muted-foreground py-8">Nenhum usuário encontrado</p>}
            </div>
          </div>
        )}

        {/* ═══ PRODUCTS ═══ */}
        {activeTab === 'products' && (
          <div>
            <div className="flex gap-3 mb-6 flex-wrap">
              <IndustrialButton size="lg" variant="success" onClick={() => setShowCategoryForm(true)} icon={<Plus className="w-5 h-5" />}>Nova Categoria</IndustrialButton>
              <IndustrialButton size="lg" variant="primary" onClick={() => { setEditingProductId(null); setProductFormData({ name: '', category_id: '', unit_weight_kg: '', base_unit: 'kg', conversion_factor: '1', package_type: 'bulk', package_weight: '0' }); setShowProductForm(true); }} icon={<Plus className="w-5 h-5" />}>Novo Produto</IndustrialButton>
            </div>

            {showCategoryForm && (
              <AdminModal title={editingCategoryId ? '✏️ Editar Categoria' : '➕ Nova Categoria'} onClose={() => { setShowCategoryForm(false); setEditingCategoryId(null); setCategoryFormData(''); }}>
                <AdminInput label="Nome" value={categoryFormData} onChange={e => setCategoryFormData(e.target.value)} />
                <div className="flex gap-3 pt-4">
                  <IndustrialButton size="lg" variant="secondary" onClick={() => setShowCategoryForm(false)} className="flex-1">Cancelar</IndustrialButton>
                  <IndustrialButton size="lg" variant="success" onClick={handleSaveCategory} className="flex-1">{editingCategoryId ? 'Atualizar' : 'Criar'}</IndustrialButton>
                </div>
              </AdminModal>
            )}

            {showProductForm && (
              <AdminModal title={editingProductId ? '✏️ Editar Produto' : '➕ Novo Produto'} onClose={() => { setShowProductForm(false); setEditingProductId(null); }}>
                <AdminInput label="Nome" value={productFormData.name} onChange={e => setProductFormData(prev => ({ ...prev, name: e.target.value }))} />
                <AdminSelect label="Categoria" value={productFormData.category_id} onChange={e => setProductFormData(prev => ({ ...prev, category_id: e.target.value }))}>
                  <option value="">Selecione...</option>
                  {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </AdminSelect>
                <AdminInput label="Peso unitário (kg)" type="text" inputMode="decimal" value={productFormData.unit_weight_kg} onChange={e => setProductFormData(prev => ({ ...prev, unit_weight_kg: e.target.value }))} />
                <AdminSelect label="Unidade base" value={productFormData.base_unit} onChange={e => setProductFormData(prev => ({ ...prev, base_unit: e.target.value }))}>
                  <option value="kg">kg</option>
                  <option value="un">Unidade</option>
                </AdminSelect>
                <AdminInput label="Fator de conversão" type="text" inputMode="decimal" value={productFormData.conversion_factor} onChange={e => setProductFormData(prev => ({ ...prev, conversion_factor: e.target.value }))} />
                <AdminSelect label="Tipo embalagem" value={productFormData.package_type} onChange={e => setProductFormData(prev => ({ ...prev, package_type: e.target.value }))}>
                  <option value="bulk">Granel (bulk)</option>
                  <option value="unit">Unidade</option>
                  <option value="sealed_bag">Saco fechado</option>
                </AdminSelect>
                {productFormData.package_type === 'sealed_bag' && (
                  <AdminInput label="Peso do saco (kg)" type="text" inputMode="decimal" value={productFormData.package_weight} onChange={e => setProductFormData(prev => ({ ...prev, package_weight: e.target.value }))} />
                )}
                <div className="flex gap-3 pt-4">
                  <IndustrialButton size="lg" variant="secondary" onClick={() => setShowProductForm(false)} className="flex-1">Cancelar</IndustrialButton>
                  <IndustrialButton size="lg" variant="success" onClick={handleSaveProduct} className="flex-1">{editingProductId ? 'Atualizar' : 'Criar'}</IndustrialButton>
                </div>
              </AdminModal>
            )}

            <div className="space-y-4">
              {categories.map(category => (
                <div key={category.id} className="bg-card border-2 border-border rounded-lg overflow-hidden">
                  <div className="flex justify-between items-center p-4 bg-secondary">
                    <h3 className="text-lg font-bold text-foreground">{category.name}</h3>
                    <div className="flex gap-2">
                      <button onClick={() => { setCategoryFormData(category.name); setEditingCategoryId(category.id); setShowCategoryForm(true); }}
                        className="p-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg transition-colors touch-target"><Edit2 className="w-4 h-4" /></button>
                      <button onClick={() => handleDeleteCategory(category.id)}
                        className="p-2 bg-destructive hover:bg-destructive/90 text-destructive-foreground rounded-lg transition-colors touch-target"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </div>
                  <div className="divide-y divide-border">
                    {products.filter(p => p.category_id === category.id).map(product => (
                      <div key={product.id} className="px-4 py-3 flex items-center justify-between">
                        <div>
                          <p className="text-foreground font-semibold text-sm">{product.name}</p>
                          <p className="text-muted-foreground text-xs">
                            {product.unit_weight_kg}kg/un • {product.base_unit} • {product.package_type}
                            {product.package_type === 'sealed_bag' && ` (${product.package_weight}kg/saco)`}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <button onClick={() => handleEditProduct(product)} className="p-2 bg-primary/80 hover:bg-primary text-primary-foreground rounded-lg transition-colors touch-target"><Edit2 className="w-4 h-4" /></button>
                          <button onClick={() => handleDeleteProduct(product.id)} className="p-2 bg-destructive/80 hover:bg-destructive text-destructive-foreground rounded-lg transition-colors touch-target"><Trash2 className="w-4 h-4" /></button>
                        </div>
                      </div>
                    ))}
                    {products.filter(p => p.category_id === category.id).length === 0 && (
                      <div className="px-4 py-3 text-muted-foreground text-sm text-center">Nenhum produto</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ═══ FORMULATIONS ═══ */}
        {activeTab === 'formulations' && (
          <div>
            <div className="mb-6">
              <IndustrialButton size="lg" variant="success" onClick={() => { setEditingFormulationId(null); setFormulationFormData({ name: '', final_product: '', machine: '', weight_per_batch: '' }); setShowFormulationForm(true); }} icon={<Plus className="w-6 h-6" />}>
                Nova Formulação
              </IndustrialButton>
            </div>

            {showFormulationForm && (
              <AdminModal title={editingFormulationId ? '✏️ Editar Formulação' : '➕ Nova Formulação'} onClose={() => { setShowFormulationForm(false); setEditingFormulationId(null); }}>
                <AdminInput label="Nome" value={formulationFormData.name} onChange={e => setFormulationFormData(prev => ({ ...prev, name: e.target.value }))} />
                <div>
                  <label className="text-foreground font-bold text-xs mb-1 block">Produto Final</label>
                  <input
                    list="final-products-list"
                    value={formulationFormData.final_product}
                    onChange={e => setFormulationFormData(prev => ({ ...prev, final_product: e.target.value }))}
                    placeholder="Ex: Telha, Forro"
                    className="w-full px-4 py-3 bg-input border-2 border-border rounded-lg text-foreground placeholder-muted-foreground font-semibold touch-target"
                  />
                  <datalist id="final-products-list">
                    {[...new Set(formulations.map(f => f.final_product))].map(fp => (
                      <option key={fp} value={fp} />
                    ))}
                  </datalist>
                </div>
                <div>
                  <label className="text-foreground font-bold text-xs mb-1 block">Máquina (Misturador)</label>
                  <select
                    value={formulationFormData.machine}
                    onChange={e => setFormulationFormData(prev => ({ ...prev, machine: e.target.value }))}
                    className="w-full px-4 py-3 bg-input border-2 border-border rounded-lg text-foreground font-semibold touch-target"
                  >
                    <option value="">Selecione...</option>
                    {mixers.filter(m => m.active).map(m => (
                      <option key={m.id} value={m.name}>{m.name} ({m.capacity_kg}kg)</option>
                    ))}
                    {/* Also show existing formulation machines not in mixers */}
                    {[...new Set(formulations.map(f => f.machine))].filter(fm => !mixers.some(m => m.name === fm)).map(m => (
                      <option key={m} value={m}>{m} (legado)</option>
                    ))}
                  </select>
                </div>
                <AdminInput label="Peso por batida (kg)" type="text" inputMode="decimal" value={formulationFormData.weight_per_batch} onChange={e => setFormulationFormData(prev => ({ ...prev, weight_per_batch: e.target.value }))} />
                <div className="flex gap-3 pt-4">
                  <IndustrialButton size="lg" variant="secondary" onClick={() => setShowFormulationForm(false)} className="flex-1">Cancelar</IndustrialButton>
                  <IndustrialButton size="lg" variant="success" onClick={handleSaveFormulation} className="flex-1">{editingFormulationId ? 'Atualizar' : 'Criar'}</IndustrialButton>
                </div>
              </AdminModal>
            )}

            {showDetailForm && (
              <AdminModal title="➕ Adicionar Item à Formulação" onClose={() => { setShowDetailForm(null); setDetailFormData({ product_id: '', quantity_per_batch: '' }); }}>
                <AdminSelect label="Matéria-Prima" value={detailFormData.product_id} onChange={e => setDetailFormData(prev => ({ ...prev, product_id: e.target.value }))}>
                  <option value="">Selecione...</option>
                  {products.map(p => <option key={p.id} value={p.id}>{p.name} ({getCategoryName(p.category_id)})</option>)}
                </AdminSelect>
                <AdminInput label="Quantidade por batida (kg)" type="text" inputMode="decimal" value={detailFormData.quantity_per_batch} onChange={e => setDetailFormData(prev => ({ ...prev, quantity_per_batch: e.target.value }))} />
                <div className="flex gap-3 pt-4">
                  <IndustrialButton size="lg" variant="secondary" onClick={() => setShowDetailForm(null)} className="flex-1">Cancelar</IndustrialButton>
                  <IndustrialButton size="lg" variant="success" onClick={handleAddFormulationItem} className="flex-1">Adicionar</IndustrialButton>
                </div>
              </AdminModal>
            )}

            <div className="space-y-4">
              {formulations.map(f => (
                <div key={f.id} className="bg-card border-2 border-border rounded-lg overflow-hidden">
                  <div className="flex justify-between items-center p-4 bg-secondary">
                    <div>
                      <h3 className="text-foreground font-bold">{f.name}</h3>
                      <p className="text-muted-foreground text-xs">{f.final_product} • {f.machine} • {f.weight_per_batch}kg/batida</p>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => { fetchFormulationDetails(f.id); setShowDetailForm(f.id); }}
                        className="p-2 bg-industrial-success hover:bg-industrial-success/90 text-industrial-success-foreground rounded-lg transition-colors touch-target"><Plus className="w-4 h-4" /></button>
                      <button onClick={() => handleEditFormulation(f)}
                        className="p-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg transition-colors touch-target"><Edit2 className="w-4 h-4" /></button>
                      <button onClick={() => handleDeleteFormulation(f.id)}
                        className="p-2 bg-destructive hover:bg-destructive/90 text-destructive-foreground rounded-lg transition-colors touch-target"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </div>
                  <FormulationItemsList formulationId={f.id} products={products} getCategoryName={getCategoryName} onDelete={handleDeleteFormulationItem} />
                </div>
              ))}
              {formulations.length === 0 && <p className="text-center text-muted-foreground py-8">Nenhuma formulação cadastrada</p>}
            </div>
          </div>
        )}

        {/* ═══ LOCATIONS ═══ */}
        {activeTab === 'locations' && (
          <div className="space-y-4">
            <div className="bg-card border-2 border-border rounded-lg p-4">
              <p className="text-muted-foreground text-sm mb-4">
                Gerencie locais do sistema com controle total na página dedicada.
              </p>
              <IndustrialButton size="lg" variant="primary" onClick={() => setLocation('/admin/locations')} icon={<Edit2 className="w-5 h-5" />}>
                Abrir Gestão de Locais
              </IndustrialButton>
            </div>
            <div className="space-y-3">
              {locations.map(loc => (
                <div key={loc.id} className={`bg-card border-2 rounded-lg p-4 flex items-center justify-between ${loc.active ? 'border-border' : 'border-destructive/30 opacity-60'}`}>
                  <div>
                    <p className="text-foreground font-bold">{loc.name}</p>
                    <p className="text-muted-foreground text-xs">Código: {loc.code} • Ordem: {loc.sort_order}</p>
                    {loc.description && <p className="text-muted-foreground text-xs">{loc.description}</p>}
                  </div>
                  <span className={`px-2 py-1 rounded text-xs font-bold ${loc.active ? 'bg-industrial-success/20 text-industrial-success' : 'bg-destructive/20 text-destructive'}`}>
                    {loc.active ? 'Ativo' : 'Inativo'}
                  </span>
                </div>
              ))}
              {locations.length === 0 && <p className="text-center text-muted-foreground py-8">Nenhum local cadastrado</p>}
            </div>
          </div>
        )}

        {activeTab === 'stock-adjust' && (
          <div>
            <div className="bg-destructive/10 border-2 border-destructive/30 rounded-lg p-4 mb-4">
              <p className="text-destructive font-bold text-sm flex items-center gap-2">
                ⚠️ Ajuste direto de estoque. Use com cuidado — todas as alterações são auditadas.
              </p>
            </div>
            <IndustrialButton size="lg" variant="primary" onClick={() => setLocation('/admin/stock-adjustment')} icon={<Edit2 className="w-5 h-5" />}>
              Abrir Ferramenta de Ajuste
            </IndustrialButton>
          </div>
        )}
      </div>
    </div>
  );
}
