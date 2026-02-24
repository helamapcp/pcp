import React, { useState } from 'react';
import { useUserManagement, type UserRole } from '@/contexts/UserManagementContext';
import { useEstoque } from '@/contexts/EstoqueContext';
import { useLocation } from 'wouter';
import { IndustrialButton } from '@/components/IndustrialButton';
import { X, Plus, Trash2, Edit2, LogOut } from 'lucide-react';
import { toast } from 'sonner';

export default function AdminPanel() {
  const [, setLocation] = useLocation();
  const { currentUser, setCurrentUser, users, addUser, updateUser, deleteUser } = useUserManagement();
  const { products, categories, addCategory, updateCategory, deleteCategory, addProduct, updateProduct, deleteProduct, unitWeights, updateUnitWeight, getUnitWeight } = useEstoque();

  const [activeTab, setActiveTab] = useState<'users' | 'products' | 'weights'>('users');
  const [showUserForm, setShowUserForm] = useState(false);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [userFormData, setUserFormData] = useState({ name: '', username: '', password: '', role: 'operador' as UserRole });

  const [showCategoryForm, setShowCategoryForm] = useState(false);
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [categoryFormData, setCategoryFormData] = useState('');

  const [showProductForm, setShowProductForm] = useState(false);
  const [productFormData, setProductFormData] = useState({ name: '', category: '', type: 'raw_material' as 'raw_material' | 'production' | 'scrap', weight: '' });

  const [editingWeights, setEditingWeights] = useState<Record<string, number>>({});

  const handleLogout = () => {
    setCurrentUser(null);
    setLocation('/login');
  };

  if (!currentUser || currentUser.role !== 'admin') {
    setLocation('/login');
    return null;
  }

  // USER MANAGEMENT
  const handleAddUser = () => {
    if (userFormData.name && userFormData.username && userFormData.password) {
      if (editingUserId) {
        updateUser(editingUserId, userFormData.name, userFormData.username, userFormData.password, userFormData.role);
        toast.success('Usuário atualizado!');
        setEditingUserId(null);
      } else {
        addUser(userFormData.name, userFormData.username, userFormData.password, userFormData.role);
        toast.success('Usuário criado!');
      }
      setUserFormData({ name: '', username: '', password: '', role: 'operador' });
      setShowUserForm(false);
    }
  };

  const handleEditUser = (userId: string) => {
    const user = users.find(u => u.id === userId);
    if (user) {
      setUserFormData({ name: user.name, username: user.username, password: user.password, role: user.role });
      setEditingUserId(userId);
      setShowUserForm(true);
    }
  };

  const handleCancelUserForm = () => {
    setShowUserForm(false);
    setEditingUserId(null);
    setUserFormData({ name: '', username: '', password: '', role: 'operador' });
  };

  // CATEGORY MANAGEMENT
  const handleAddCategory = () => {
    if (categoryFormData.trim()) {
      if (editingCategoryId) {
        updateCategory(editingCategoryId, categoryFormData);
        toast.success('Categoria atualizada!');
        setEditingCategoryId(null);
      } else {
        addCategory(categoryFormData, undefined, currentUser.name);
        toast.success('Categoria criada!');
      }
      setCategoryFormData('');
      setShowCategoryForm(false);
    }
  };

  const handleEditCategory = (categoryId: string) => {
    const cat = categories.find(c => c.id === categoryId);
    if (cat) {
      setCategoryFormData(cat.name);
      setEditingCategoryId(categoryId);
      setShowCategoryForm(true);
    }
  };

  const handleCancelCategoryForm = () => {
    setShowCategoryForm(false);
    setEditingCategoryId(null);
    setCategoryFormData('');
  };

  // PRODUCT MANAGEMENT
  const handleAddProduct = () => {
    if (productFormData.name && productFormData.category && productFormData.weight) {
      addProduct(productFormData.name, productFormData.category, productFormData.type, parseFloat(productFormData.weight), currentUser.name);
      toast.success(`Produto "${productFormData.name}" criado!`);
      setProductFormData({ name: '', category: '', type: 'raw_material', weight: '' });
      setShowProductForm(false);
    }
  };

  const getRoleLabel = (role: UserRole) => {
    const labels: Record<UserRole, string> = { admin: '🔐 Admin', gerente: '👔 Gerente', operador: '👷 Operador' };
    return labels[role];
  };

  const getRoleColor = (role: UserRole) => {
    const colors: Record<UserRole, string> = {
      admin: 'bg-destructive/20 text-destructive border-destructive/50',
      gerente: 'bg-primary/20 text-primary border-primary/50',
      operador: 'bg-industrial-success/20 text-industrial-success border-industrial-success/50',
    };
    return colors[role];
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <div className="bg-card border-b-2 border-border sticky top-0 z-10 p-4">
        <div className="flex justify-between items-center max-w-7xl mx-auto">
          <div>
            <h1 className="text-2xl md:text-3xl font-black text-foreground">🔐 Super Admin</h1>
            <p className="text-muted-foreground text-sm">{currentUser.name} • Configurações do Sistema</p>
          </div>
          <button
            onClick={handleLogout}
            className="p-3 bg-destructive hover:bg-destructive/90 text-destructive-foreground rounded-lg transition-colors touch-target"
            title="Sair"
          >
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
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-5 py-4 font-bold transition-colors whitespace-nowrap touch-target ${
              activeTab === tab.id
                ? 'text-primary border-b-3 border-primary'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
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
              <IndustrialButton size="lg" variant="success" onClick={() => setShowUserForm(true)} icon={<Plus className="w-6 h-6" />}>
                Adicionar Usuário
              </IndustrialButton>
            </div>

            {showUserForm && (
              <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
                <div className="bg-card border-2 border-primary rounded-2xl w-full max-w-md shadow-2xl">
                  <div className="bg-secondary px-6 py-5 border-b-2 border-border flex justify-between items-center">
                    <h2 className="text-xl font-bold text-foreground">
                      {editingUserId ? '✏️ Editar Usuário' : '➕ Novo Usuário'}
                    </h2>
                    <button onClick={handleCancelUserForm} className="p-2 hover:bg-accent rounded-lg touch-target">
                      <X className="w-6 h-6 text-foreground" />
                    </button>
                  </div>
                  <div className="p-6 space-y-4">
                    <input type="text" value={userFormData.name} onChange={(e) => setUserFormData({ ...userFormData, name: e.target.value })}
                      placeholder="Nome Completo" className="w-full px-4 py-3 bg-input border-2 border-border rounded-lg text-foreground placeholder-muted-foreground font-semibold touch-target" />
                    <input type="text" value={userFormData.username} onChange={(e) => setUserFormData({ ...userFormData, username: e.target.value })}
                      placeholder="Usuário (Username)" className="w-full px-4 py-3 bg-input border-2 border-border rounded-lg text-foreground placeholder-muted-foreground font-semibold touch-target" />
                    <input type="password" value={userFormData.password} onChange={(e) => setUserFormData({ ...userFormData, password: e.target.value })}
                      placeholder="Senha" className="w-full px-4 py-3 bg-input border-2 border-border rounded-lg text-foreground placeholder-muted-foreground font-semibold touch-target" />
                    <div className="grid grid-cols-3 gap-2">
                      {(['operador', 'gerente', 'admin'] as UserRole[]).map(role => (
                        <button key={role} onClick={() => setUserFormData({ ...userFormData, role })}
                          className={`px-3 py-3 rounded-lg font-bold transition-all border-2 text-sm touch-target ${
                            userFormData.role === role ? 'bg-primary text-primary-foreground border-primary' : 'bg-card text-secondary-foreground border-border hover:bg-secondary'
                          }`}>
                          {getRoleLabel(role).split(' ')[1]}
                        </button>
                      ))}
                    </div>
                    <div className="flex gap-3 pt-4">
                      <IndustrialButton size="lg" variant="secondary" onClick={handleCancelUserForm} className="flex-1">Cancelar</IndustrialButton>
                      <IndustrialButton size="lg" variant="success" onClick={handleAddUser} className="flex-1">{editingUserId ? 'Atualizar' : 'Criar'}</IndustrialButton>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Users List (mobile-friendly cards) */}
            <div className="space-y-3">
              {users.map(user => (
                <div key={user.id} className="bg-card border-2 border-border rounded-lg p-4 flex items-center justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-foreground font-bold truncate">{user.name}</p>
                    <p className="text-muted-foreground text-sm">@{user.username}</p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-bold border ${getRoleColor(user.role)} whitespace-nowrap`}>
                    {getRoleLabel(user.role)}
                  </span>
                  <div className="flex gap-2">
                    <button onClick={() => handleEditUser(user.id)} className="p-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg transition-colors touch-target">
                      <Edit2 className="w-5 h-5" />
                    </button>
                    <button onClick={() => { deleteUser(user.id); toast.success('Usuário removido'); }}
                      className="p-2 bg-destructive hover:bg-destructive/90 text-destructive-foreground rounded-lg transition-colors disabled:opacity-50 touch-target"
                      disabled={user.id === 'admin-001'}>
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              ))}
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
                    <button onClick={handleCancelCategoryForm} className="p-2 hover:bg-accent rounded-lg touch-target">
                      <X className="w-6 h-6 text-foreground" />
                    </button>
                  </div>
                  <div className="p-6 space-y-4">
                    <input type="text" value={categoryFormData} onChange={(e) => setCategoryFormData(e.target.value)}
                      placeholder="Nome da Categoria" className="w-full px-4 py-3 bg-input border-2 border-border rounded-lg text-foreground placeholder-muted-foreground font-semibold touch-target" />
                    <div className="flex gap-3 pt-4">
                      <IndustrialButton size="lg" variant="secondary" onClick={handleCancelCategoryForm} className="flex-1">Cancelar</IndustrialButton>
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
                    <select value={productFormData.category} onChange={(e) => setProductFormData({ ...productFormData, category: e.target.value })}
                      className="w-full px-4 py-3 bg-input border-2 border-border rounded-lg text-foreground font-semibold touch-target">
                      <option value="">Selecione a Categoria</option>
                      {categories.map(cat => (
                        <option key={cat.id} value={cat.name}>{cat.name}</option>
                      ))}
                    </select>
                    <select value={productFormData.type} onChange={(e) => setProductFormData({ ...productFormData, type: e.target.value as any })}
                      className="w-full px-4 py-3 bg-input border-2 border-border rounded-lg text-foreground font-semibold touch-target">
                      <option value="raw_material">Matéria Prima</option>
                      <option value="production">Produção</option>
                      <option value="scrap">Sucata</option>
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
                      <button onClick={() => handleEditCategory(category.id)} className="p-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg transition-colors touch-target">
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button onClick={() => { deleteCategory(category.id, currentUser.name); toast.success('Categoria removida'); }}
                        className="p-2 bg-destructive hover:bg-destructive/90 text-destructive-foreground rounded-lg transition-colors touch-target">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  <div className="divide-y divide-border">
                    {products.filter(p => p.category === category.name).map(product => (
                      <div key={product.id} className="px-4 py-3 flex items-center justify-between">
                        <div>
                          <p className="text-foreground font-semibold text-sm">{product.name}</p>
                          <p className="text-muted-foreground text-xs">{product.defaultUnitWeight}kg/unidade</p>
                        </div>
                        <button onClick={() => { deleteProduct(product.id, currentUser.name); toast.success('Produto removido'); }}
                          className="p-2 bg-destructive/80 hover:bg-destructive text-destructive-foreground rounded-lg transition-colors touch-target">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                    {products.filter(p => p.category === category.name).length === 0 && (
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
                  <p className="text-muted-foreground text-xs">{product.category}</p>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={editingWeights[product.id] ?? getUnitWeight(product.id)}
                    onChange={(e) => setEditingWeights({ ...editingWeights, [product.id]: parseFloat(e.target.value) })}
                    className="w-20 px-2 py-2 bg-input border-2 border-border rounded text-foreground text-center font-semibold text-sm touch-target"
                  />
                  <span className="text-muted-foreground text-xs">kg</span>
                  <button
                    onClick={() => {
                      updateUnitWeight(product.id, editingWeights[product.id] ?? getUnitWeight(product.id), currentUser.name);
                      const { [product.id]: _, ...rest } = editingWeights;
                      setEditingWeights(rest);
                      toast.success('Peso atualizado!');
                    }}
                    className="px-3 py-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg transition-colors font-semibold text-sm touch-target"
                  >
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
