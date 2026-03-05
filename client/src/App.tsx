import React from 'react';
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch, useLocation } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import AppLayout from "./components/layout/AppLayout";
import EstoqueLogin from "./pages/EstoqueLogin";
import OperatorDashboardV2 from "./pages/OperatorDashboardV2";
import CDStockEntry from "./pages/CDStockEntry";
import TransferCDtoPCP from "./pages/TransferCDtoPCP";
import ProductionOrderPage from "./pages/ProductionOrderPage";
import ProductionBagsPage from "./pages/ProductionBagsPage";
import TransferPMPtoFactory from "./pages/TransferPMPtoFactory";
import InventoryCountPage from "./pages/InventoryCountPage";
import AdminPanel from "./pages/AdminPanel";
import AdminStockAdjustment from "./pages/AdminStockAdjustment";
import AdminLocationsPage from "./pages/AdminLocationsPage";
import AdminMixersPage from "./pages/AdminMixersPage";
import ExecutiveDashboard from "./pages/ExecutiveDashboard";
import ManagerDashboard from "./pages/manager/ManagerDashboard";
import ManagerMovements from "./pages/manager/ManagerMovements";
import ManagerTransfers from "./pages/manager/ManagerTransfers";
import ManagerProduction from "./pages/manager/ManagerProduction";
import ManagerBatches from "./pages/manager/ManagerBatches";
import ManagerAdjustments from "./pages/manager/ManagerAdjustments";
import ManagerAudit from "./pages/manager/ManagerAudit";
import ManagerPurchases from "./pages/manager/ManagerPurchases";
import ManagerPlanning from "./pages/manager/ManagerPlanning";
import ProductionSchedulePage from "./pages/ProductionSchedulePage";
import { Loader2 } from 'lucide-react';

function ProtectedRoute({ component: Component, allowedRoles }: { component: React.ComponentType; allowedRoles: string[] }) {
  const { user, loading } = useAuth();
  const [, setLocation] = useLocation();

  React.useEffect(() => {
    if (!loading && !user) {
      setLocation('/login');
    } else if (!loading && user && !allowedRoles.includes(user.role)) {
      setLocation('/login');
    }
  }, [user, loading, setLocation, allowedRoles]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user || !allowedRoles.includes(user.role)) return null;

  return (
    <AppLayout>
      <Component />
    </AppLayout>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={EstoqueLogin} />
      <Route path="/login" component={EstoqueLogin} />
      
      {/* Operator routes */}
      <Route path="/operator" component={() => <ProtectedRoute component={OperatorDashboardV2} allowedRoles={['operador']} />} />
      <Route path="/operator/cd-entry" component={() => <ProtectedRoute component={CDStockEntry} allowedRoles={['operador']} />} />
      <Route path="/operator/transfer-cd-pcp" component={() => <ProtectedRoute component={TransferCDtoPCP} allowedRoles={['operador']} />} />
      <Route path="/operator/production" component={() => <ProtectedRoute component={ProductionOrderPage} allowedRoles={['operador']} />} />
      <Route path="/operator/production-bags" component={() => <ProtectedRoute component={ProductionBagsPage} allowedRoles={['operador']} />} />
      <Route path="/operator/transfer-pmp-factory" component={() => <ProtectedRoute component={TransferPMPtoFactory} allowedRoles={['operador']} />} />
      <Route path="/operator/inventory-count" component={() => <ProtectedRoute component={InventoryCountPage} allowedRoles={['operador']} />} />
      
      {/* Manager routes */}
      <Route path="/manager" component={() => <ProtectedRoute component={ManagerDashboard} allowedRoles={['gerente']} />} />
      <Route path="/manager/planejamento" component={() => <ProtectedRoute component={ManagerPlanning} allowedRoles={['gerente']} />} />
      <Route path="/manager/movimentacoes" component={() => <ProtectedRoute component={ManagerMovements} allowedRoles={['gerente']} />} />
      <Route path="/manager/transferencias" component={() => <ProtectedRoute component={ManagerTransfers} allowedRoles={['gerente']} />} />
      <Route path="/manager/producao" component={() => <ProtectedRoute component={ManagerProduction} allowedRoles={['gerente']} />} />
      <Route path="/manager/programacao" component={() => <ProtectedRoute component={ProductionSchedulePage} allowedRoles={['gerente']} />} />
      <Route path="/manager/compras" component={() => <ProtectedRoute component={ManagerPurchases} allowedRoles={['gerente']} />} />
      <Route path="/manager/lotes" component={() => <ProtectedRoute component={ManagerBatches} allowedRoles={['gerente']} />} />
      <Route path="/manager/ajustes" component={() => <ProtectedRoute component={ManagerAdjustments} allowedRoles={['gerente']} />} />
      <Route path="/manager/auditoria" component={() => <ProtectedRoute component={ManagerAudit} allowedRoles={['gerente']} />} />
      
      {/* Admin routes */}
      <Route path="/admin" component={() => <ProtectedRoute component={AdminPanel} allowedRoles={['admin']} />} />
      <Route path="/admin/products" component={() => <ProtectedRoute component={AdminPanel} allowedRoles={['admin']} />} />
      <Route path="/admin/formulations" component={() => <ProtectedRoute component={AdminPanel} allowedRoles={['admin']} />} />
      <Route path="/admin/stock-adjustment" component={() => <ProtectedRoute component={AdminStockAdjustment} allowedRoles={['admin']} />} />
      <Route path="/admin/locations" component={() => <ProtectedRoute component={AdminLocationsPage} allowedRoles={['admin']} />} />
      <Route path="/admin/mixers" component={() => <ProtectedRoute component={AdminMixersPage} allowedRoles={['admin']} />} />
      
      {/* Executive dashboard */}
      <Route path="/dashboard/executive" component={() => <ProtectedRoute component={ExecutiveDashboard} allowedRoles={['admin', 'gerente']} />} />
      
      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <AuthProvider>
          <TooltipProvider>
            <Toaster />
            <Router />
          </TooltipProvider>
        </AuthProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
