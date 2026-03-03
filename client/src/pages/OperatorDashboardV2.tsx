import React from 'react';
import { useLocation } from 'wouter';
import { useAuth } from '@/contexts/AuthContext';
import { Package, ArrowRightLeft, Factory, Truck, ClipboardList } from 'lucide-react';

export default function OperatorDashboardV2() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();

  if (!user) return null;

  const menuItems = [
    { label: 'Entrada no CD', description: 'Registrar recebimento de materiais', icon: Package, path: '/operator/cd-entry', color: 'border-industrial-success hover:bg-industrial-success/10', iconColor: 'text-industrial-success' },
    { label: 'Transferência CD → PCP', description: 'Criar e confirmar transferências', icon: ArrowRightLeft, path: '/operator/transfer-cd-pcp', color: 'border-primary hover:bg-primary/10', iconColor: 'text-primary' },
    { label: 'Produção PCP → PMP', description: 'Ordem de produção com formulação', icon: Factory, path: '/operator/production', color: 'border-industrial-warning hover:bg-industrial-warning/10', iconColor: 'text-industrial-warning' },
    { label: 'Envio PMP → Fábrica', description: 'Transferir composto para a fábrica', icon: Truck, path: '/operator/transfer-pmp-factory', color: 'border-destructive hover:bg-destructive/10', iconColor: 'text-destructive' },
    { label: 'Contagem de Inventário', description: 'Snapshot físico com ajuste automático', icon: ClipboardList, path: '/operator/inventory-count', color: 'border-accent hover:bg-accent/10', iconColor: 'text-muted-foreground' },
  ];

  return (
    <div className="p-4 space-y-4">
      <div>
        <h1 className="text-2xl font-black text-foreground">📱 Painel do Operador</h1>
        <p className="text-muted-foreground text-sm">{user.fullName} • Selecione uma operação</p>
      </div>

      <div className="space-y-3">
        {menuItems.map(item => {
          const Icon = item.icon;
          return (
            <button key={item.path} onClick={() => setLocation(item.path)}
              className={`w-full bg-card border-2 ${item.color} rounded-xl p-5 flex items-center gap-4 transition-colors touch-target text-left`}>
              <div className="p-3 rounded-lg bg-secondary">
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
  );
}
