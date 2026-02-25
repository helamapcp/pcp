import React, { useState, useEffect, useCallback } from 'react';
import { useLocation } from 'wouter';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { IndustrialButton } from '@/components/IndustrialButton';
import { X, Plus, Trash2, Edit2, LogOut, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

type AppRole = 'admin' | 'gerente' | 'operador';

interface UserItem {
  id: string;
  username: string;
  full_name: string;
  role: AppRole;
  created_at: string;
}

interface CategoryItem {
  id: string;
  name: string;
}

interface ProductItem {
  id: string;
  name: string;
  category_id: string | null;
  unit_weight_kg: number;
}

export default function AdminPanel() {
  const [, setLocation] = useLocation();
  const { user, signOut } = useAuth();

  const [activeTab, setActiveTab] = useState<'users' | 'products' | 'weights'>('users');

  // Users state
  const [users, setUsers] = useState<UserItem[]>([]);
  const [showUserForm, setShowUserForm] = useState(false);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [userFormData, setUserFormData] = useState({ name: '', email: '', password: '', role: 'operador' as AppRole });
  const [userLoading, setUserLoading] = useState(false);

  // Categories state
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [showCategoryForm, setShowCategoryForm] = useState(false);
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [categoryFormData, setCategoryFormData] = useState('');

  // Products state
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [showProductForm, setShowProductForm] = useState(false);
  const [productFormData, setProductFormData] = useState({ name: '', category_id: '', weight: '' });

  // Weights editing
  const [editingWeights, setEditingWeights] = useState<Record<string, number>>({});

  const handleLogout = async () => {
    await signOut();
    setLocation('/login');
  };

  // Fetch users via edge function
  const fetchUsers = useCallback(async () => {
    const { data, error } = await supabase.functions.invoke('manage-users', {
      body: { action: 'list' },
    });
    if (!error && data?.users) setUsers(data.users);
  }, []);

  // Fetch categories
  const fetchCategories = useCallback(async () => {
    const { data } = await supabase.from('categories').select('*').order('name');
    if (data) setCategories(data);
  }, []);

  // Fetch products
  const fetchProducts = useCallback(async () => {
    const { data } = await supabase.from('products').select('*').order('name');
    if (data) setProducts(data);
  }, []);

  useEffect(() => {
    fetchUsers();
    fetchCategories();
    fetchProducts();
  }, [fetchUsers, fetchCategories, fetchProducts]);

  if (!user || user.role !== 'admin') {
    setLocation('/login');
    return null;
  }

  // USER MANAGEMENT
  const handleAddUser = async () => {
    if (!userFormData.name || !userFormData.email || !userFormData.password) return;
    setUserLoading(true);

    const action = editingUserId ? 'update' : 'create';
    const body: any = {
      action,
      username: userFormData.email.split('@')[0],
      full_name: userFormData.name,
      email: userFormData.email,
      password: userFormData.password,
      role: userFormData.role,
    };
    if (editingUserId) body.userId = editingUserId;

    const { data, error } = await supabase.functions.invoke('manage-users', { body });
    if (error || data?.error) {
      toast.error(data?.error || error?.message || 'Erro ao salvar usuário');
    } else {
      toast.success(editingUserId ? 'Usuário atualizado!' : 'Usuário criado!');
      setShowUserForm(false);
      setEditingUserId(null);
      setUserFormData({ name: '', email: '', password: '', role: 'operador' });
      fetchUsers();
    }
    setUserLoading(false);
  };

  const handleEditUser = (u: UserItem) => {
    setUserFormData({ name: u.full_name, email: '', password: '', role: u.role });
    setEditingUserId(u.id);
    setShowUserForm(true);
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm('Tem certeza que deseja remover este usuário?')) return;
    const { data, error } = await supabase.functions.invoke('manage-users', {
      body: { action: 'delete', userId },
    });
    if (error || data?.error) {
      toast.error(data?.error || 'Erro ao remover');
    } else {
      toast.success('Usuário removido');
      fetchUsers();
    }
  };

  // CATEGORY MANAGEMENT
  const handleAddCategory = async () => {
    if (!categoryFormData.trim()) return;
    if (editingCategoryId) {
      await supabase.from('categories').update({ name: categoryFormData }).eq('id', editingCategoryId);
      toast.success('Categoria atualizada!');
    } else {
      await supabase.from('categories').insert({ name: categoryFormData });
      toast.success('Categoria criada!');
    }
    setCategoryFormData('');
    setShowCategoryForm(false);
    setEditingCategoryId(null);
    fetchCategories();
    fetchProducts(); // refresh category names
  };

  const handleDeleteCategory = async (id: string) => {
    await supabase.from('categories').delete().eq('id', id);
    toast.success('Categoria removida');
    fetchCategories();
  };

  // PRODUCT MANAGEMENT
  const handleAddProduct = async () => {
    if (!productFormData.name || !productFormData.category_id || !productFormData.weight) return;
    await supabase.from('products').insert({
      name: productFormData.name,
      category_id: productFormData.category_id,
      unit_weight_kg: parseFloat(productFormData.weight),
    });
    toast.success(`Produto "${productFormData.name}" criado!`);
    setProductFormData({ name: '', category_id: '', weight: '' });
    setShowProductForm(false);
    fetchProducts();
  };

  const handleDeleteProduct = async (id: string) => {
    await supabase.from('products').delete().eq('id', id);
    toast.success('Produto removido');
    fetchProducts();
  };

  const handleUpdateWeight = async (productId: string) => {
    const newWeight = editingWeights[productId];
    if (newWeight === undefined) return;
    await supabase.from('products').update({ unit_weight_kg: newWeight }).eq('id', productId);
    const { [productId]: _, ...rest } = editingWeights;
    setEditingWeights(rest);
    toast.success('Peso atualizado!');
    fetchProducts();
  };

  const getRoleLabel = (role: AppRole) => {
    const labels: Record<AppRole, string> = { admin: '🔐 Admin', gerente: '👔 Gerente', operador: '👷 Operador' };
    return labels[role];
  };

  const getRoleColor = (role: AppRole) => {
    const colors: Record<AppRole, string> = {
      admin: 'bg-destructive/20 text-destructive border-destructive/50',
      gerente: 'bg-primary/20 text-primary border-primary/50',
      operador: 'bg-industrial-success/20 text-industrial-success border-industrial-success/50',
    };
    return colors[role];
  };

  const getCategoryName = (catId: string | null) => categories.find(c => c.id === catId)?.name || 'Sem Categoria';

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
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

      {/* Tabs */}
      <div className="flex gap-1 border-b-2 border-border bg-card/50 px-2 overflow-x-auto">
        {[
          { id: 'users' as const, label: '👥 Usuários' },
          { id: 'products' as const, label: '📦 Produtos' },
          { id: 'weights' as const, label: '⚖️ Pesos' },
        ].map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={`px-5 py-4 font-bold transition-colors whitespace-nowrap touch-target ${
              activeTab === tab.id ? 'text-primary border-b-3 border-primary' : 'text-muted-foreground hover:text-foreground'
            }`}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 p-4 md:p-6 overflow-y-auto max-w-7xl mx-auto w-full">
        {/* USERS TAB */}
        {activeTab === 'users' && (
          <div>
            <div className="mb-6">
              <IndustrialButton size="lg" variant="success" onClick={() => { setEditingUserId(null); setUserFormData({ name: '', email: '', password: '', role: 'operador' }); setShowUserForm(true); }} icon={<Plus className="w-6 h-6" />}>
                Adicionar Usuário
              </IndustrialButton>
            </div>

            {showUserForm && (
              <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
                <div className="bg-card border-2 border-primary rounded-2xl w-full max-w-md shadow-2xl">
                  <div className="bg-secondary px-6 py-5 border-b-2 border-border flex justify-between items-center">
                    <h2 className="text-xl font-bold text-foreground">{editingUserId ? '✏️ Editar Usuário' : '➕ Novo Usuário'}</h2>
                    <button onClick={() => { setShowUserForm(false); setEditingUserId(null); }} className="p-2 hover:bg-accent rounded-lg touch-target">
                      <X className="w-6 h-6 text-foreground" />
                    </button>
                  </div>
                  <div className="p-6 space-y-4">
                    <input type="text" value={userFormData.name} onChange={(e) => setUserFormData({ ...userFormData, name: e.target.value })}
                      placeholder="Nome Completo" className="w-full px-4 py-3 bg-input border-2 border-border rounded-lg text-foreground placeholder-muted-foreground font-semibold touch-target" />
                    <input type="email" value={userFormData.email} onChange={(e) => setUserFormData({ ...userFormData, email: e.target.value })}
                      placeholder="E-mail" className="w-full px-4 py-3 bg-input border-2 border-border rounded-lg text-foreground placeholder-muted-foreground font-semibold touch-target" />
                    <input type="password" value={userFormData.password} onChange={(e) => setUserFormData({ ...userFormData, password: e.target.value })}
                      placeholder="Senha" className="w-full px-4 py-3 bg-input border-2 border-border rounded-lg text-foreground placeholder-muted-foreground font-semibold touch-target" />
                    <div className="grid grid-cols-3 gap-2">
                      {(['operador', 'gerente', 'admin'] as AppRole[]).map(role => (
                        <button key={role} onClick={() => setUserFormData({ ...userFormData, role })}
                          className={`px-3 py-3 rounded-lg font-bold transition-all border-2 text-sm touch-target ${
                            userFormData.role === role ? 'bg-primary text-primary-foreground border-primary' : 'bg-card text-secondary-foreground border-border hover:bg-secondary'
                          }`}>
                          {getRoleLabel(role).split(' ')[1]}
                        </button>
                      ))}
                    </div>
                    <div className="flex gap-3 pt-4">
                      <IndustrialButton size="lg" variant="secondary" onClick={() => { setShowUserForm(false); setEditingUserId(null); }} className="flex-1">Cancelar</IndustrialButton>
                      <IndustrialButton size="lg" variant="success" onClick={handleAddUser} disabled={userLoading} className="flex-1">
                        {userLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : editingUserId ? 'Atualizar' : 'Criar'}
                      </IndustrialButton>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-3">
              {users.map(u => (
                <div key={u.id} className="bg-card border-2 border-border rounded-lg p-4 flex items-center justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-foreground font-bold truncate">{u.full_name}</p>
                    <p className="text-muted-foreground text-sm">@{u.username}</p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-bold border ${getRoleColor(u.role)} whitespace-nowrap`}>
                    {getRoleLabel(u.role)}
                  </span>
                  <div className="flex gap-2">
                    <button onClick={() => handleEditUser(u)} className="p-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg transition-colors touch-target">
                      <Edit2 className="w-5 h-5" />
                    </button>
                    <button onClick={() => handleDeleteUser(u.id)}
                      className="p-2 bg-destructive hover:bg-destructive/90 text-destructive-foreground rounded-lg transition-colors disabled:opacity-50 touch-target"
                      disabled={u.id === user.id}>
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              ))}
              {users.length === 0 && <p className="text-center text-muted-foreground py-8">Nenhum usuário encontrado</p>}
            </div>
          </div>
        )}

        {/* PRODUCTS TAB */}
        {activeTab === 'products' && (
          <div>
            <div className="flex gap-3 mb-6 flex-wrap">
              <IndustrialButton size="lg" variant="success" onClick={() => setShowCategoryForm(true)} icon={<Plus className="w-5 h-5" />}>
                Nova Categoria
              </IndustrialButton>
              <IndustrialButton size="lg" variant="primary" onClick={() => setShowProductForm(true)} icon={<Plus className="w-5 h-5" />}>
                Novo Produto
              </IndustrialButton>
            </div>

            {/* Category Form Modal */}
            {showCategoryForm && (
              <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
                <div className="bg-card border-2 border-primary rounded-2xl w-full max-w-md shadow-2xl">
                  <div className="bg-secondary px-6 py-5 border-b-2 border-border flex justify-between items-center">
                    <h2 className="text-xl font-bold text-foreground">{editingCategoryId ? '✏️ Editar' : '➕ Nova'} Categoria</h2>
                    <button onClick={() => { setShowCategoryForm(false); setEditingCategoryId(null); setCategoryFormData(''); }} className="p-2 hover:bg-accent rounded-lg touch-target">
                      <X className="w-6 h-6 text-foreground" />
                    </button>
                  </div>
                  <div className="p-6 space-y-4">
                    <input type="text" value={categoryFormData} onChange={(e) => setCategoryFormData(e.target.value)}
                      placeholder="Nome da Categoria" className="w-full px-4 py-3 bg-input border-2 border-border rounded-lg text-foreground placeholder-muted-foreground font-semibold touch-target" />
                    <div className="flex gap-3 pt-4">
                      <IndustrialButton size="lg" variant="secondary" onClick={() => { setShowCategoryForm(false); setEditingCategoryId(null); setCategoryFormData(''); }} className="flex-1">Cancelar</IndustrialButton>
                      <IndustrialButton size="lg" variant="success" onClick={handleAddCategory} className="flex-1">{editingCategoryId ? 'Atualizar' : 'Criar'}</IndustrialButton>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Product Form Modal */}
            {showProductForm && (
              <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
                <div className="bg-card border-2 border-primary rounded-2xl w-full max-w-md shadow-2xl">
                  <div className="bg-secondary px-6 py-5 border-b-2 border-border flex justify-between items-center">
                    <h2 className="text-xl font-bold text-foreground">➕ Novo Produto</h2>
                    <button onClick={() => setShowProductForm(false)} className="p-2 hover:bg-accent rounded-lg touch-target">
                      <X className="w-6 h-6 text-foreground" />
                    </button>
                  </div>
                  <div className="p-6 space-y-4">
                    <input type="text" value={productFormData.name} onChange={(e) => setProductFormData({ ...productFormData, name: e.target.value })}
                      placeholder="Nome do Produto" className="w-full px-4 py-3 bg-input border-2 border-border rounded-lg text-foreground placeholder-muted-foreground font-semibold touch-target" />
                    <select value={productFormData.category_id} onChange={(e) => setProductFormData({ ...productFormData, category_id: e.target.value })}
                      className="w-full px-4 py-3 bg-input border-2 border-border rounded-lg text-foreground font-semibold touch-target">
                      <option value="">Selecione a Categoria</option>
                      {categories.map(cat => (
                        <option key={cat.id} value={cat.id}>{cat.name}</option>
                      ))}
                    </select>
                    <input type="number" value={productFormData.weight} onChange={(e) => setProductFormData({ ...productFormData, weight: e.target.value })}
                      placeholder="Peso unitário (kg)" className="w-full px-4 py-3 bg-input border-2 border-border rounded-lg text-foreground placeholder-muted-foreground font-semibold touch-target" />
                    <div className="flex gap-3 pt-4">
                      <IndustrialButton size="lg" variant="secondary" onClick={() => setShowProductForm(false)} className="flex-1">Cancelar</IndustrialButton>
                      <IndustrialButton size="lg" variant="success" onClick={handleAddProduct} className="flex-1">Criar Produto</IndustrialButton>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Categories & Products List */}
            <div className="space-y-4">
              {categories.map(category => (
                <div key={category.id} className="bg-card border-2 border-border rounded-lg overflow-hidden">
                  <div className="flex justify-between items-center p-4 bg-secondary">
                    <h3 className="text-lg font-bold text-foreground">{category.name}</h3>
                    <div className="flex gap-2">
                      <button onClick={() => { setCategoryFormData(category.name); setEditingCategoryId(category.id); setShowCategoryForm(true); }}
                        className="p-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg transition-colors touch-target">
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDeleteCategory(category.id)}
                        className="p-2 bg-destructive hover:bg-destructive/90 text-destructive-foreground rounded-lg transition-colors touch-target">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  <div className="divide-y divide-border">
                    {products.filter(p => p.category_id === category.id).map(product => (
                      <div key={product.id} className="px-4 py-3 flex items-center justify-between">
                        <div>
                          <p className="text-foreground font-semibold text-sm">{product.name}</p>
                          <p className="text-muted-foreground text-xs">{product.unit_weight_kg}kg/unidade</p>
                        </div>
                        <button onClick={() => handleDeleteProduct(product.id)}
                          className="p-2 bg-destructive/80 hover:bg-destructive text-destructive-foreground rounded-lg transition-colors touch-target">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                    {products.filter(p => p.category_id === category.id).length === 0 && (
                      <div className="px-4 py-3 text-muted-foreground text-sm text-center">Nenhum produto nesta categoria</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* WEIGHTS TAB */}
        {activeTab === 'weights' && (
          <div className="space-y-3">
            {products.map(product => (
              <div key={product.id} className="bg-card border-2 border-border rounded-lg p-4 flex items-center justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-foreground font-semibold text-sm truncate">{product.name}</p>
                  <p className="text-muted-foreground text-xs">{getCategoryName(product.category_id)}</p>
                </div>
                <div className="flex items-center gap-2">
                  <input type="number"
                    value={editingWeights[product.id] ?? product.unit_weight_kg}
                    onChange={(e) => setEditingWeights({ ...editingWeights, [product.id]: parseFloat(e.target.value) })}
                    className="w-20 px-2 py-2 bg-input border-2 border-border rounded text-foreground text-center font-semibold text-sm touch-target" />
                  <span className="text-muted-foreground text-xs">kg</span>
                  <button onClick={() => handleUpdateWeight(product.id)}
                    className="px-3 py-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg transition-colors font-semibold text-sm touch-target">
                    Salvar
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
