import React, { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { useAuth } from '@/contexts/AuthContext';
import { IndustrialButton } from '@/components/IndustrialButton';
import { Lock, User, Loader2 } from 'lucide-react';

export default function EstoqueLogin() {
  const [, setLocation] = useLocation();
  const { user, loading: authLoading, signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    if (user && !authLoading) {
      if (user.role === 'admin') setLocation('/admin');
      else if (user.role === 'gerente') setLocation('/manager');
      else setLocation('/operator');
    }
  }, [user, authLoading, setLocation]);

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      setError('Preencha todos os campos');
      return;
    }
    setLoading(true);
    setError('');
    const result = await signIn(email, password);
    if (result.error) {
      setError('Credenciais inválidas. Verifique e-mail e senha.');
      setPassword('');
    }
    setLoading(false);
  };




  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleLogin();
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      {/* Header */}
      <div className="mb-10 text-center">
        <div className="inline-flex items-center justify-center w-20 h-20 bg-primary rounded-2xl mb-4">
          <span className="text-3xl font-black text-primary-foreground">INV</span>
        </div>
        <h1 className="text-4xl font-black text-foreground mb-1">ESTOQUE</h1>
        <p className="text-muted-foreground text-base">Gestão de Inventário e Controle de Estoque</p>
        <div className="h-1 w-16 bg-primary mx-auto mt-4 rounded-full"></div>
      </div>

      {/* Login Form */}
      <div className="w-full max-w-md">
        <div className="bg-card border-2 border-border rounded-2xl p-6 md:p-8 space-y-6">
          <div>
            <label className="block text-foreground text-sm font-bold mb-2">
              <User className="w-4 h-4 inline-block mr-1 mb-0.5" />
              E-mail
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => { setEmail(e.target.value); setError(''); }}
              onKeyDown={handleKeyPress}
              placeholder="seu@email.com"
              autoComplete="email"
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
            disabled={loading}
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Entrar'}
          </IndustrialButton>
        </div>

        <div className="text-center mt-6 text-muted-foreground text-xs">
          <p>Sistema de Gestão de Inventário e Controle Operacional</p>
        </div>
      </div>
    </div>
  );
}
