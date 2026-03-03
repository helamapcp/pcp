import React from 'react';
import { useLocation } from 'wouter';
import { useAuth } from '@/contexts/AuthContext';
import { NAVIGATION, getDefaultRoute } from '@/config/navigation';
import { LogOut, Menu, X, ChevronRight } from 'lucide-react';
import { useState } from 'react';

function AppSidebar({ collapsed, onClose }: { collapsed: boolean; onClose: () => void }) {
  const [location, setLocation] = useLocation();
  const { user } = useAuth();
  if (!user) return null;

  const groups = NAVIGATION[user.role] || [];

  return (
    <aside className={`
      fixed inset-y-0 left-0 z-40 flex flex-col
      bg-card border-r-2 border-border
      transition-transform duration-200 ease-in-out
      w-64
      ${collapsed ? '-translate-x-full' : 'translate-x-0'}
      lg:relative lg:translate-x-0
    `}>
      {/* Header */}
      <div className="p-4 border-b-2 border-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
            <span className="text-primary-foreground font-black text-sm">E</span>
          </div>
          <div>
            <p className="text-foreground font-black text-sm leading-tight">Estoque</p>
            <p className="text-muted-foreground text-[10px] font-semibold">Industrial v2</p>
          </div>
        </div>
        <button onClick={onClose} className="lg:hidden p-1 hover:bg-secondary rounded">
          <X className="w-5 h-5 text-muted-foreground" />
        </button>
      </div>

      {/* Nav Groups */}
      <nav className="flex-1 overflow-y-auto p-3 space-y-4">
        {groups.map(group => (
          <div key={group.title}>
            <p className="text-muted-foreground text-[10px] font-bold uppercase tracking-wider px-3 mb-2">
              {group.title}
            </p>
            <div className="space-y-0.5">
              {group.items.map(item => {
                const Icon = item.icon;
                const active = location === item.path;
                return (
                  <button
                    key={item.path}
                    onClick={() => { setLocation(item.path); onClose(); }}
                    className={`
                      w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all text-sm
                      ${active
                        ? 'bg-primary/15 text-primary font-bold border border-primary/30'
                        : 'text-muted-foreground hover:bg-secondary hover:text-foreground font-medium'
                      }
                    `}
                  >
                    <Icon className={`w-4 h-4 flex-shrink-0 ${active ? 'text-primary' : ''}`} />
                    <span className="truncate">{item.label}</span>
                    {active && <ChevronRight className="w-3 h-3 ml-auto text-primary" />}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* User footer */}
      <div className="p-3 border-t-2 border-border">
        <div className="flex items-center gap-3 px-2">
          <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
            <span className="text-primary font-bold text-xs">{user.fullName.charAt(0).toUpperCase()}</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-foreground font-bold text-xs truncate">{user.fullName}</p>
            <p className="text-muted-foreground text-[10px]">
              {user.role === 'admin' ? '🔐 Admin' : user.role === 'gerente' ? '👔 Gerente' : '👷 Operador'}
            </p>
          </div>
        </div>
      </div>
    </aside>
  );
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, signOut } = useAuth();
  const [, setLocation] = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = async () => {
    await signOut();
    setLocation('/login');
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-background flex">
      {/* Overlay for mobile */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-30 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      <AppSidebar collapsed={!sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="bg-card border-b-2 border-border sticky top-0 z-20 px-4 h-14 flex items-center justify-between">
          <button onClick={() => setSidebarOpen(true)} className="lg:hidden p-2 hover:bg-secondary rounded-lg transition-colors">
            <Menu className="w-5 h-5 text-foreground" />
          </button>
          <div className="hidden lg:block" />
          <button onClick={handleLogout} className="p-2 bg-destructive/10 hover:bg-destructive/20 text-destructive rounded-lg transition-colors" title="Sair">
            <LogOut className="w-5 h-5" />
          </button>
        </header>

        {/* Main content */}
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
