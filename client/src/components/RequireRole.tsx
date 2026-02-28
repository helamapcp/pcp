import React from 'react';
import { useAuth, type AppRole } from '@/contexts/AuthContext';

interface RequireRoleProps {
  roles: AppRole[];
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

/**
 * Centralized permission guard component.
 * Only renders children if the current user has one of the allowed roles.
 */
export function RequireRole({ roles, children, fallback = null }: RequireRoleProps) {
  const { user, loading } = useAuth();

  if (loading) return null;
  if (!user || !roles.includes(user.role)) return <>{fallback}</>;

  return <>{children}</>;
}

/**
 * Hook for checking permissions programmatically.
 */
export function usePermission() {
  const { user } = useAuth();

  const hasRole = (roles: AppRole | AppRole[]): boolean => {
    if (!user) return false;
    const roleArray = Array.isArray(roles) ? roles : [roles];
    return roleArray.includes(user.role);
  };

  const isAdmin = user?.role === 'admin';
  const isManager = user?.role === 'gerente';
  const isOperator = user?.role === 'operador';

  return { hasRole, isAdmin, isManager, isOperator, user };
}
