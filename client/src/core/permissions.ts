/**
 * Centralized Permission Guard v2.0
 * Single source of truth for role-based access control.
 */

export type AppRole = 'admin' | 'gerente' | 'operador';

// Permission checks
export const canAdjustStock = (role: AppRole) => role === 'admin';
export const canCreateProduction = (role: AppRole) => role === 'operador' || role === 'admin';
export const canManageLocations = (role: AppRole) => role === 'admin';
export const canManageProducts = (role: AppRole) => role === 'admin';
export const canManageMixers = (role: AppRole) => role === 'admin';
export const canManageFormulations = (role: AppRole) => role === 'admin';
export const canManageUsers = (role: AppRole) => role === 'admin';
export const canViewDashboard = (role: AppRole) => role === 'gerente' || role === 'admin';
export const canPerformTransfer = (role: AppRole) => role === 'operador' || role === 'admin';
export const canCountInventory = (role: AppRole) => role === 'operador' || role === 'admin';
export const canViewExecutiveDashboard = (role: AppRole) => role === 'gerente' || role === 'admin';

// Route access map
export const ROLE_ROUTES: Record<AppRole, string[]> = {
  admin: ['/admin', '/admin/stock-adjustment', '/admin/locations', '/admin/mixers', '/dashboard/executive'],
  gerente: ['/manager', '/dashboard/executive'],
  operador: ['/operator', '/operator/cd-entry', '/operator/transfer-cd-pcp', '/operator/production', '/operator/transfer-pmp-factory', '/operator/inventory-count'],
};

/**
 * Get the default redirect path for a role.
 */
export function getDefaultRoute(role: AppRole): string {
  switch (role) {
    case 'admin': return '/admin';
    case 'gerente': return '/manager';
    case 'operador': return '/operator';
  }
}
