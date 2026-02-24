import React, { useState } from 'react';
import { useLocation } from 'wouter';
import { useUserManagement } from '@/contexts/UserManagementContext';
import { IndustrialButton } from '@/components/IndustrialButton';
import { Lock, User } from 'lucide-react';

export default function EstoqueLogin() {
  const [, setLocation] = useLocation();
  const { authenticateUser } = useUserManagement();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleLogin = () => {
    if (!username.trim() || !password.trim()) {
      setError('Preencha todos os campos');
      return;
    }
    const user = authenticateUser(username, password);
    if (user) {
      setError('');
      setUsername('');
      setPassword('');
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
    if (e.key === 'Enter') handleLogin();
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      {/* Header */}
      <div className="mb-10 text-center">
        <div className="inline-flex items-center justify-center w-20 h-20 bg-primary rounded-2xl mb-4">
          <span className="text-3xl font-black text-primary-foreground">PVC</span>
        </div>
        <h1 className="text-4xl font-black text-foreground mb-1">ESTOQUE</h1>
        <p className="text-muted-foreground text-base">Sistema de Inventário Industrial</p>
        <div className="h-1 w-16 bg-primary mx-auto mt-4 rounded-full"></div>
      </div>

      {/* Login Form */}
      <div className="w-full max-w-md">
        <div className="bg-card border-2 border-border rounded-2xl p-6 md:p-8 space-y-6">
          <div>
            <label className="block text-foreground text-sm font-bold mb-2">
              <User className="w-4 h-4 inline-block mr-1 mb-0.5" />
              Usuário
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => { setUsername(e.target.value); setError(''); }}
              onKeyDown={handleKeyPress}
              placeholder="Digite seu usuário"
              autoComplete="username"
              className="w-full px-4 py-3 bg-input border-2 border-border rounded-lg text-foreground placeholder-muted-foreground font-semibold touch-target focus:border-primary focus:ring-2 focus:ring-ring transition-colors"
            />
          </div>

          <div>
            <label className="block text-foreground text-sm font-bold mb-2">
              <Lock className="w-4 h-4 inline-block mr-1 mb-0.5" />
              Senha
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => { setPassword(e.target.value); setError(''); }}
              onKeyDown={handleKeyPress}
              placeholder="Digite sua senha"
              autoComplete="current-password"
              className="w-full px-4 py-3 bg-input border-2 border-border rounded-lg text-foreground placeholder-muted-foreground font-semibold touch-target focus:border-primary focus:ring-2 focus:ring-ring transition-colors"
            />
          </div>

          {error && (
            <div className="bg-destructive/10 border-2 border-destructive rounded-lg p-4">
              <p className="text-destructive text-sm font-semibold">⚠️ {error}</p>
            </div>
          )}

          <IndustrialButton
            size="xl"
            variant="primary"
            onClick={handleLogin}
          >
            Entrar
          </IndustrialButton>
        </div>

        {/* Demo Info (dev only) */}
        <div className="mt-6 bg-card/50 border border-border rounded-lg p-4">
          <p className="text-muted-foreground text-xs text-center font-bold mb-2">DEMO - CREDENCIAIS</p>
          <div className="grid grid-cols-3 gap-2 text-xs text-center">
            <div className="bg-secondary rounded p-2">
              <p className="text-foreground font-bold">Admin</p>
              <p className="text-muted-foreground">admin / password123</p>
            </div>
            <div className="bg-secondary rounded p-2">
              <p className="text-foreground font-bold">Gerente</p>
              <p className="text-muted-foreground">gerente / mgr123</p>
            </div>
            <div className="bg-secondary rounded p-2">
              <p className="text-foreground font-bold">Operador</p>
              <p className="text-muted-foreground">operador1 / op123</p>
            </div>
          </div>
        </div>

        <div className="text-center mt-6 text-muted-foreground text-xs">
          <p>Sistema de Controle de Inventário • Fábrica de PVC</p>
        </div>
      </div>
    </div>
  );
}
