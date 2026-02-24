import React, { useState } from 'react';
import { useUserManagement, type UserRole } from '@/contexts/UserManagementContext';
import { IndustrialButton } from '@/components/IndustrialButton';
import { X, Plus, Trash2, Edit2 } from 'lucide-react';

export default function AdminPanel() {
  const { users, addUser, updateUser, deleteUser } = useUserManagement();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    username: '',
    pin: '',
    role: 'operador' as UserRole,
  });

  const handleAddUser = () => {
    if (formData.name && formData.username && formData.pin) {
      if (editingId) {
        updateUser(editingId, formData.name, formData.username, formData.pin, formData.role);
        setEditingId(null);
      } else {
        addUser(formData.name, formData.username, formData.pin, formData.role);
      }
      setFormData({ name: '', username: '', pin: '', role: 'operador' });
      setShowForm(false);
    }
  };

  const handleEdit = (userId: string) => {
    const user = users.find(u => u.id === userId);
    if (user) {
      setFormData({
        name: user.name,
        username: user.username,
        pin: user.pin,
        role: user.role,
      });
      setEditingId(userId);
      setShowForm(true);
    }
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingId(null);
    setFormData({ name: '', username: '', pin: '', role: 'operador' });
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
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-black text-white mb-2">🔐 Gerenciamento de Usuários</h1>
          <p className="text-slate-400">Painel de Administração - Controle de Acesso e Roles</p>
        </div>

        {/* Add User Button */}
        <div className="mb-8">
          <IndustrialButton
            size="lg"
            variant="success"
            onClick={() => setShowForm(true)}
            icon={<Plus className="w-6 h-6" />}
          >
            Adicionar Novo Usuário
          </IndustrialButton>
        </div>

        {/* Form Modal */}
        {showForm && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
            <div className="bg-slate-900 border-4 border-blue-500 rounded-2xl w-full max-w-md shadow-2xl">
              <div className="bg-slate-800 px-6 py-5 border-b-2 border-slate-700 flex justify-between items-center">
                <h2 className="text-2xl font-bold text-white">
                  {editingId ? '✏️ Editar Usuário' : '➕ Novo Usuário'}
                </h2>
                <button
                  onClick={handleCancel}
                  className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
                >
                  <X className="w-6 h-6 text-white" />
                </button>
              </div>

              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-white text-sm font-bold mb-2">Nome Completo</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Ex: João Silva"
                    className="w-full px-4 py-3 bg-slate-800 border-2 border-slate-600 rounded-lg text-white placeholder-slate-500 font-semibold min-h-[48px]"
                  />
                </div>

                <div>
                  <label className="block text-white text-sm font-bold mb-2">Usuário/Crachá</label>
                  <input
                    type="text"
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                    placeholder="Ex: joao.silva"
                    className="w-full px-4 py-3 bg-slate-800 border-2 border-slate-600 rounded-lg text-white placeholder-slate-500 font-semibold min-h-[48px]"
                  />
                </div>

                <div>
                  <label className="block text-white text-sm font-bold mb-2">PIN (4 dígitos)</label>
                  <input
                    type="text"
                    value={formData.pin}
                    onChange={(e) => setFormData({ ...formData, pin: e.target.value.slice(0, 4) })}
                    placeholder="1234"
                    maxLength={4}
                    className="w-full px-4 py-3 bg-slate-800 border-2 border-slate-600 rounded-lg text-white placeholder-slate-500 font-semibold min-h-[48px] text-center text-2xl tracking-widest"
                  />
                </div>

                <div>
                  <label className="block text-white text-sm font-bold mb-2">Função</label>
                  <div className="grid grid-cols-3 gap-2">
                    {(['operador', 'gerente', 'admin'] as UserRole[]).map(role => (
                      <button
                        key={role}
                        onClick={() => setFormData({ ...formData, role })}
                        className={`px-3 py-3 rounded-lg font-bold transition-all border-2 text-sm ${
                          formData.role === role
                            ? 'bg-blue-600 text-white border-blue-500'
                            : 'bg-slate-700 text-slate-300 border-slate-600 hover:bg-slate-600'
                        }`}
                      >
                        {getRoleLabel(role).split(' ')[1]}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex gap-3 pt-4">
                  <IndustrialButton
                    size="lg"
                    variant="secondary"
                    onClick={handleCancel}
                    className="flex-1"
                  >
                    Cancelar
                  </IndustrialButton>
                  <IndustrialButton
                    size="lg"
                    variant="success"
                    onClick={handleAddUser}
                    className="flex-1"
                  >
                    {editingId ? 'Atualizar' : 'Criar'}
                  </IndustrialButton>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Users Table */}
        <div className="bg-slate-800 border-2 border-slate-700 rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-900 border-b-2 border-slate-600">
                <tr>
                  <th className="px-6 py-4 text-left text-white font-bold">Nome</th>
                  <th className="px-6 py-4 text-left text-white font-bold">Usuário</th>
                  <th className="px-6 py-4 text-center text-white font-bold">PIN</th>
                  <th className="px-6 py-4 text-center text-white font-bold">Função</th>
                  <th className="px-6 py-4 text-center text-white font-bold">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700">
                {users.map(user => (
                  <tr key={user.id} className="hover:bg-slate-700/50 transition-colors">
                    <td className="px-6 py-4 text-white font-semibold">{user.name}</td>
                    <td className="px-6 py-4 text-slate-300">{user.username}</td>
                    <td className="px-6 py-4 text-center text-white font-mono font-bold">{user.pin}</td>
                    <td className="px-6 py-4 text-center">
                      <span className={`px-3 py-1 rounded-full text-xs font-bold border ${getRoleColor(user.role)}`}>
                        {getRoleLabel(user.role)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex gap-2 justify-center">
                        <button
                          onClick={() => handleEdit(user.id)}
                          className="p-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                        >
                          <Edit2 className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => deleteUser(user.id)}
                          className="p-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
                          disabled={user.id === 'admin-001'}
                          title={user.id === 'admin-001' ? 'Não é possível deletar o Admin padrão' : ''}
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

        {/* Summary */}
        <div className="mt-8 grid grid-cols-3 gap-4">
          <div className="bg-slate-800 border-2 border-slate-700 rounded-lg p-6">
            <p className="text-slate-400 text-sm font-bold mb-2">TOTAL DE USUÁRIOS</p>
            <p className="text-4xl font-black text-white">{users.length}</p>
          </div>
          <div className="bg-slate-800 border-2 border-slate-700 rounded-lg p-6">
            <p className="text-slate-400 text-sm font-bold mb-2">OPERADORES</p>
            <p className="text-4xl font-black text-green-400">{users.filter(u => u.role === 'operador').length}</p>
          </div>
          <div className="bg-slate-800 border-2 border-slate-700 rounded-lg p-6">
            <p className="text-slate-400 text-sm font-bold mb-2">GERENTES</p>
            <p className="text-4xl font-black text-blue-400">{users.filter(u => u.role === 'gerente').length}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
