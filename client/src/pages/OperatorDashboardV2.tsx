import React, { useState } from 'react';
import { useLocation } from 'wouter';
import { useAuth } from '@/contexts/AuthContext';
import { LogOut, Package, ArrowRightLeft, BarChart3 } from 'lucide-react';

export default function OperatorDashboardV2() {
  const [, setLocation] = useLocation();
  const { user, signOut } = useAuth();

  const handleLogout = async () => {
    await signOut();
    setLocation('/login');
  };

  if (!user) {
    setLocation('/login');
    return null;
  }

  const menuItems = [
    {
      label: 'Entrada no CD',
      description: 'Registrar recebimento de materiais',
      icon: Package,
      path: '/operator/cd-entry',
      color: 'border-industrial-success hover:bg-industrial-success/10',
      iconColor: 'text-industrial-success',
    },
    {
      label: 'Transferência CD → PCP',
      description: 'Criar e confirmar transferências',
      icon: ArrowRightLeft,
      path: '/operator/transfer-cd-pcp',
      color: 'border-primary hover:bg-primary/10',
      iconColor: 'text-primary',
    },
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="bg-card border-b-2 border-border sticky top-0 z-10 p-4">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-black text-foreground">📱 Operador</h1>
            <p className="text-muted-foreground text-sm">{user.fullName} • Painel de Operações</p>
          </div>
          <button onClick={handleLogout} className="p-3 bg-destructive hover:bg-destructive/90 text-destructive-foreground rounded-lg transition-colors touch-target" title="Sair">
            <LogOut className="w-6 h-6" />
          </button>
        </div>
      </div>

      <div className="flex-1 p-4 space-y-4">
        <div className="bg-card border-2 border-border rounded-lg p-4">
          <p className="text-muted-foreground text-sm">
            💡 <span className="font-semibold text-foreground">Selecione uma operação</span> para começar.
          </p>
        </div>

        <div className="space-y-3">
          {menuItems.map(item => {
            const Icon = item.icon;
            return (
              <button
                key={item.path}
                onClick={() => setLocation(item.path)}
                className={`w-full bg-card border-2 ${item.color} rounded-xl p-5 flex items-center gap-4 transition-colors touch-target text-left`}
              >
                <div className={`p-3 rounded-lg bg-secondary`}>
                  <Icon className={`w-7 h-7 ${item.iconColor}`} />
                </div>
                <div>
                  <p className="text-foreground font-bold text-lg">{item.label}</p>
                  <p className="text-muted-foreground text-sm">{item.description}</p>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
