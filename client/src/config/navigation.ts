/**
 * Navigation Configuration — Single Source of Truth
 * All role-based menu items are defined here.
 */
import {
  Package, ArrowRightLeft, Factory, Truck, ClipboardList,
  BarChart3, ScrollText, Layers, Scale, Users, Settings2,
  MapPin, FlaskConical, LayoutDashboard,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export type AppRole = 'admin' | 'gerente' | 'operador';

export interface NavItem {
  label: string;
  path: string;
  icon: LucideIcon;
  description?: string;
}

export interface NavGroup {
  title: string;
  items: NavItem[];
}

export const NAVIGATION: Record<AppRole, NavGroup[]> = {
  operador: [
    {
      title: 'Operações',
      items: [
        { label: 'Painel', path: '/operator', icon: LayoutDashboard, description: 'Visão geral' },
        { label: 'Entrada CD', path: '/operator/cd-entry', icon: Package, description: 'Recebimento de materiais' },
        { label: 'Transferência CD→PCP', path: '/operator/transfer-cd-pcp', icon: ArrowRightLeft, description: 'Criar transferências' },
        { label: 'Produção PCP→PMP', path: '/operator/production', icon: Factory, description: 'Ordem de produção' },
        { label: 'Envio PMP→Fábrica', path: '/operator/transfer-pmp-factory', icon: Truck, description: 'Transferir composto' },
        { label: 'Inventário', path: '/operator/inventory-count', icon: ClipboardList, description: 'Contagem física' },
      ],
    },
  ],
  gerente: [
    {
      title: 'Gestão',
      items: [
        { label: 'Dashboard', path: '/manager', icon: BarChart3, description: 'KPIs e visão analítica' },
        { label: 'Movimentações', path: '/manager/movimentacoes', icon: Package, description: 'Histórico de movimentações' },
        { label: 'Transferências', path: '/manager/transferencias', icon: ArrowRightLeft, description: 'Transferências entre locais' },
        { label: 'Produção', path: '/manager/producao', icon: Factory, description: 'Ordens de produção' },
        { label: 'Lotes', path: '/manager/lotes', icon: Layers, description: 'Lotes produzidos' },
        { label: 'Ajustes', path: '/manager/ajustes', icon: Scale, description: 'Ajustes de estoque' },
        { label: 'Auditoria', path: '/manager/auditoria', icon: ScrollText, description: 'Trilha de auditoria' },
      ],
    },
    {
      title: 'Relatórios',
      items: [
        { label: 'Dashboard Executivo', path: '/dashboard/executive', icon: LayoutDashboard, description: 'Gráficos industriais' },
      ],
    },
  ],
  admin: [
    {
      title: 'Administração',
      items: [
        { label: 'Usuários', path: '/admin', icon: Users, description: 'Gestão de usuários' },
        { label: 'Produtos', path: '/admin/products', icon: Package, description: 'Produtos e categorias' },
        { label: 'Formulações', path: '/admin/formulations', icon: FlaskConical, description: 'Receitas de produção' },
        { label: 'Locais', path: '/admin/locations', icon: MapPin, description: 'Gestão de localizações' },
        { label: 'Misturadores', path: '/admin/mixers', icon: Settings2, description: 'Máquinas de mistura' },
        { label: 'Ajuste Estoque', path: '/admin/stock-adjustment', icon: Scale, description: 'Correção manual' },
      ],
    },
    {
      title: 'Relatórios',
      items: [
        { label: 'Dashboard Executivo', path: '/dashboard/executive', icon: LayoutDashboard, description: 'Gráficos industriais' },
      ],
    },
  ],
};

/**
 * Get the default route for a role.
 */
export function getDefaultRoute(role: AppRole): string {
  switch (role) {
    case 'admin': return '/admin';
    case 'gerente': return '/manager';
    case 'operador': return '/operator';
  }
}

/**
 * Get all allowed paths for a role (for route protection).
 */
export function getAllowedPaths(role: AppRole): string[] {
  return NAVIGATION[role].flatMap(g => g.items.map(i => i.path));
}
