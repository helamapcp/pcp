import React, { useState } from 'react';
import { useUserManagement, type UserRole } from '@/contexts/UserManagementContext';
import { useEstoque } from '@/contexts/EstoqueContext';
import { useLocation } from 'wouter';
import { IndustrialButton } from '@/components/IndustrialButton';
import { X, Plus, Trash2, Edit2, LogOut } from 'lucide-react';

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
        setEditingUserId(null);
      } else {
        addUser(userFormData.name, userFormData.username, userFormData.password, userFormData.role);
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
        setEditingCategoryId(null);
      } else {
        addCategory(categoryFormData);
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

  const getRoleLabel = (role: UserRole) => {
    const labels: Record<UserRole, string> = {
      admin: '🔐 Admin',
      gerente: '👔 Gerente',
      operador: '👷 Operador',
    };
    return labels[role];
  };

  const getRoleColor = (role: UserRole) => {
    const colors: Record<UserRole, string> = {
      admin: 'bg-red-900/50 text-red-300 border-red-600',
      gerente: 'bg-blue-900/50 text-blue-300 border-blue-600',
      operador: 'bg-green-900/50 text-green-300 border-green-600',
    };
    return colors[role];
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex flex-col">
      {/* Header */}
      <div className="bg-slate-800/50 border-b-2 border-slate-700 sticky top-0 z-10 p-4">
        <div className="flex justify-between items-center max-w-7xl mx-auto">
          <div>
            <h1 className="text-3xl font-black text-white">🔐 Super Admin</h1>
            <p className="text-slate-300 text-sm">{currentUser.name} • Configurações Estruturais</p>
          </div>
          <button
            onClick={handleLogout}
            className="p-3 bg-red-600 hover:bg-red-700 active:bg-red-800 text-white rounded-lg transition-colors"
            title="Sair"
          >
            <LogOut className="w-6 h-6" />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b-2 border-slate-700 bg-slate-800/30 px-4 overflow-x-auto">
        <button
          onClick={() => setActiveTab('users')}
          className={`px-6 py-4 font-bold transition-colors whitespace-nowrap ${
            activeTab === 'users'
              ? 'text-white border-b-4 border-blue-500 bg-slate-800'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          👥 Usuários
        </button>
        <button
          onClick={() => setActiveTab('products')}
          className={`px-6 py-4 font-bold transition-colors whitespace-nowrap ${
            activeTab === 'products'
              ? 'text-white border-b-4 border-blue-500 bg-slate-800'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          📦 Produtos & Categorias
        </button>
        <button
          onClick={() => setActiveTab('weights')}
          className={`px-6 py-4 font-bold transition-colors whitespace-nowrap ${
            activeTab === 'weights'
              ? 'text-white border-b-4 border-blue-500 bg-slate-800'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          ⚖️ Pesos Unitários
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 p-6 overflow-y-auto max-w-7xl mx-auto w-full">
        {/* USERS TAB */}
        {activeTab === 'users' && (
          <div>
            <div className="mb-6">
              <IndustrialButton
                size="lg"
                variant="success"
                onClick={() => setShowUserForm(true)}
                icon={<Plus className="w-6 h-6" />}
              >
                Adicionar Novo Usuário
              </IndustrialButton>
            </div>

            {/* User Form Modal */}
            {showUserForm && (
              <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
                <div className="bg-slate-900 border-4 border-blue-500 rounded-2xl w-full max-w-md shadow-2xl">
                  <div className="bg-slate-800 px-6 py-5 border-b-2 border-slate-700 flex justify-between items-center">
                    <h2 className="text-2xl font-bold text-white">
                      {editingUserId ? '✏️ Editar Usuário' : '➕ Novo Usuário'}
                    </h2>
                    <button onClick={handleCancelUserForm} className="p-2 hover:bg-slate-700 rounded-lg">
                      <X className="w-6 h-6 text-white" />
                    </button>
                  </div>

                  <div className="p-6 space-y-4">
                    <input
                      type="text"
                      value={userFormData.name}
                      onChange={(e) => setUserFormData({ ...userFormData, name: e.target.value })}
                      placeholder="Nome Completo"
                      className="w-full px-4 py-3 bg-slate-800 border-2 border-slate-600 rounded-lg text-white placeholder-slate-500 font-semibold min-h-[48px]"
                    />
                    <input
                      type="text"
                      value={userFormData.username}
                      onChange={(e) => setUserFormData({ ...userFormData, username: e.target.value })}
                      placeholder="Usuário (Username)"
                      className="w-full px-4 py-3 bg-slate-800 border-2 border-slate-600 rounded-lg text-white placeholder-slate-500 font-semibold min-h-[48px]"
                    />
                    <input
                      type="password"
                      value={userFormData.password}
                      onChange={(e) => setUserFormData({ ...userFormData, password: e.target.value })}
                      placeholder="Senha"
                      className="w-full px-4 py-3 bg-slate-800 border-2 border-slate-600 rounded-lg text-white placeholder-slate-500 font-semibold min-h-[48px]"
                    />
                    <div className="grid grid-cols-3 gap-2">
                      {(['operador', 'gerente', 'admin'] as UserRole[]).map(role => (
                        <button
                          key={role}
                          onClick={() => setUserFormData({ ...userFormData, role })}
                          className={`px-3 py-3 rounded-lg font-bold transition-all border-2 text-sm ${
                            userFormData.role === role
                              ? 'bg-blue-600 text-white border-blue-500'
                              : 'bg-slate-700 text-slate-300 border-slate-600 hover:bg-slate-600'
                          }`}
                        >
                          {getRoleLabel(role).split(' ')[1]}
                        </button>
                      ))}
                    </div>
                    <div className="flex gap-3 pt-4">
                      <IndustrialButton size="lg" variant="secondary" onClick={handleCancelUserForm} className="flex-1">
                        Cancelar
                      </IndustrialButton>
                      <IndustrialButton size="lg" variant="success" onClick={handleAddUser} className="flex-1">
                        {editingUserId ? 'Atualizar' : 'Criar'}
                      </IndustrialButton>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Users Table */}
            <div className="bg-slate-800 border-2 border-slate-700 rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-slate-900 border-b-2 border-slate-600">
                  <tr>
                    <th className="px-6 py-4 text-left text-white font-bold">Nome</th>
                    <th className="px-6 py-4 text-left text-white font-bold">Usuário</th>
                    <th className="px-6 py-4 text-center text-white font-bold">Função</th>
                    <th className="px-6 py-4 text-center text-white font-bold">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700">
                  {users.map(user => (
                    <tr key={user.id} className="hover:bg-slate-700/50 transition-colors">
                      <td className="px-6 py-4 text-white font-semibold">{user.name}</td>
                      <td className="px-6 py-4 text-slate-300">{user.username}</td>
                      <td className="px-6 py-4 text-center">
                        <span className={`px-3 py-1 rounded-full text-xs font-bold border ${getRoleColor(user.role)}`}>
                          {getRoleLabel(user.role)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="flex gap-2 justify-center">
                          <button
                            onClick={() => handleEditUser(user.id)}
                            className="p-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                          >
                            <Edit2 className="w-5 h-5" />
                          </button>
                          <button
                            onClick={() => deleteUser(user.id)}
                            className="p-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors disabled:opacity-50"
                            disabled={user.id === 'admin-001'}
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* PRODUCTS TAB */}
        {activeTab === 'products' && (
          <div>
            <div className="mb-6">
              <IndustrialButton
                size="lg"
                variant="success"
                onClick={() => setShowCategoryForm(true)}
                icon={<Plus className="w-6 h-6" />}
              >
                Adicionar Categoria
              </IndustrialButton>
            </div>
            {/* Category Form Modal */}
            {showCategoryForm && (
              <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
                <div className="bg-slate-900 border-4 border-blue-500 rounded-2xl w-full max-w-md shadow-2xl">
                  <div className="bg-slate-800 px-6 py-5 border-b-2 border-slate-700 flex justify-between items-center">
                    <h2 className="text-2xl font-bold text-white">
                      {editingCategoryId ? '✏️ Editar Categoria' : '➕ Nova Categoria'}
                    </h2>
                    <button onClick={handleCancelCategoryForm} className="p-2 hover:bg-slate-700 rounded-lg">
                      <X className="w-6 h-6 text-white" />
                    </button>
                  </div>

                  <div className="p-6 space-y-4">
                    <input
                      type="text"
                      value={categoryFormData}
                      onChange={(e) => setCategoryFormData(e.target.value)}
                      placeholder="Nome da Categoria"
                      className="w-full px-4 py-3 bg-slate-800 border-2 border-slate-600 rounded-lg text-white placeholder-slate-500 font-semibold min-h-[48px]"
                    />
                    <div className="flex gap-3 pt-4">
                      <IndustrialButton size="lg" variant="secondary" onClick={handleCancelCategoryForm} className="flex-1">
                        Cancelar
                      </IndustrialButton>
                      <IndustrialButton size="lg" variant="success" onClick={handleAddCategory} className="flex-1">
                        {editingCategoryId ? 'Atualizar' : 'Criar'}
                      </IndustrialButton>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Categories List */}
            <div className="space-y-4">
              {categories.map(category => (
                <div key={category.id} className="bg-slate-800 border-2 border-slate-700 rounded-lg p-6">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-xl font-bold text-white">{category.name}</h3>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleEditCategory(category.id)}
                        className="p-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                      >
                        <Edit2 className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => deleteCategory(category.id)}
                        className="p-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {products
                      .filter(p => p.category === category.name)
                      .map(product => (
                        <div key={product.id} className="bg-slate-700 px-3 py-2 rounded text-slate-300 text-sm flex justify-between items-center">
                          <span>{product.name}</span>
                          <button
                            onClick={() => deleteProduct(product.id)}
                            className="p-1 bg-red-600 hover:bg-red-700 text-white rounded text-xs"
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* WEIGHTS TAB */}
        {activeTab === 'weights' && (
          <div className="bg-slate-800 border-2 border-slate-700 rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-900 border-b-2 border-slate-600">
                <tr>
                  <th className="px-6 py-4 text-left text-white font-bold">Produto</th>
                  <th className="px-6 py-4 text-center text-white font-bold">Peso Unitário (kg)</th>
                  <th className="px-6 py-4 text-center text-white font-bold">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700">
                {products.map(product => (
                  <tr key={product.id} className="hover:bg-slate-700/50 transition-colors">
                    <td className="px-6 py-4 text-white font-semibold">{product.name}</td>
                    <td className="px-6 py-4 text-center">
                      <input
                        type="number"
                        value={editingWeights[product.id] ?? getUnitWeight(product.id)}
                        onChange={(e) => setEditingWeights({ ...editingWeights, [product.id]: parseFloat(e.target.value) })}
                        className="w-24 px-3 py-2 bg-slate-700 border-2 border-slate-600 rounded text-white text-center font-semibold"
                      />
                    </td>
                    <td className="px-6 py-4 text-center">
                      <button
                        onClick={() => {
                          updateUnitWeight(product.id, editingWeights[product.id] ?? getUnitWeight(product.id));
                          const { [product.id]: _, ...rest } = editingWeights;
                          setEditingWeights(rest);
                        }}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-semibold"
                      >
                        Salvar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
