import React, { useState } from 'react';
import { useLocation } from 'wouter';
import { useUserManagement } from '@/contexts/UserManagementContext';
import { IndustrialButton } from '@/components/IndustrialButton';

export default function EstoqueLogin() {
  const [, setLocation] = useLocation();
  const { users, authenticateUser } = useUserManagement();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleLogin = () => {
    const user = authenticateUser(username, password);
    if (user) {
      setError('');
      setUsername('');
      setPassword('');
      // Route based on role
      if (user.role === 'admin') {
        setLocation('/admin');
      } else if (user.role === 'gerente') {
        setLocation('/manager');
      } else {
        setLocation('/operator');
      }
    } else {
      setError('Usuário ou senha incorretos');
      setPassword('');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleLogin();
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex flex-col items-center justify-center p-4">
      {/* Header */}
      <div className="mb-12 text-center">
        <h1 className="text-5xl font-black text-white mb-2">ESTOQUE</h1>
        <p className="text-slate-400 text-lg">Sistema de Inventário PVC</p>
        <div className="h-1 w-16 bg-blue-600 mx-auto mt-4 rounded-full"></div>
      </div>

      {/* Main Container */}
      <div className="w-full max-w-md">
        {/* User Info */}
        <div className="mb-6 bg-slate-800/50 border-2 border-slate-700 rounded-lg p-4 text-center">
          <p className="text-slate-400 text-xs font-bold mb-3">USUÁRIOS DISPONÍVEIS:</p>
          <div className="space-y-2 text-sm max-h-32 overflow-y-auto">
            {users.map(u => (
              <p key={u.id} className="text-slate-300">
                <span className="font-semibold">{u.name}</span>
                <br />
                <span className="text-slate-500 text-xs">
                  {u.role === 'admin' && '🔐 Admin'} 
                  {u.role === 'gerente' && '👔 Gerente'} 
                  {u.role === 'operador' && '👷 Operador'}
                  {' '}• User: {u.username}
                </span>
              </p>
            ))}
          </div>
        </div>

        {/* Login Form */}
        <div className="mb-8 bg-slate-800/50 border-3 border-slate-700 rounded-2xl p-8">
          <label className="block text-white text-sm font-bold mb-4">Usuário</label>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Digite seu usuário"
            className="w-full px-4 py-3 bg-slate-700 border-2 border-slate-600 rounded-lg text-white placeholder-slate-500 font-semibold mb-6 min-h-[48px]"
          />

          <label className="block text-white text-sm font-bold mb-4">Senha</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Digite sua senha"
            className="w-full px-4 py-3 bg-slate-700 border-2 border-slate-600 rounded-lg text-white placeholder-slate-500 font-semibold mb-6 min-h-[48px]"
          />

          {/* Error Message */}
          {error && (
            <div className="bg-red-900/50 border-2 border-red-500 rounded-lg p-4 mb-6">
              <p className="text-red-300 text-sm font-semibold">⚠️ {error}</p>
            </div>
          )}

          {/* Login Button */}
          <IndustrialButton
            size="lg"
            variant="success"
            onClick={handleLogin}
            className="w-full"
          >
            Entrar
          </IndustrialButton>
        </div>

        {/* Footer Info */}
        <div className="text-center text-slate-500 text-xs">
          <p>Sistema de Controle de Inventário</p>
          <p>Fábrica de PVC</p>
        </div>
      </div>
    </div>
  );
}
