import React from 'react';
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch, useLocation } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import EstoqueLogin from "./pages/EstoqueLogin";
import OperatorDashboardV2 from "./pages/OperatorDashboardV2";
import CDStockEntry from "./pages/CDStockEntry";
import TransferCDtoPCP from "./pages/TransferCDtoPCP";
import ProductionOrderPage from "./pages/ProductionOrderPage";
import TransferPMPtoFactory from "./pages/TransferPMPtoFactory";
import InventoryCountPage from "./pages/InventoryCountPage";
import ManagerDashboardV2 from "./pages/ManagerDashboardV2";
import AdminPanel from "./pages/AdminPanel";
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

  return <Component />;
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
      <Route path="/operator/transfer-pmp-factory" component={() => <ProtectedRoute component={TransferPMPtoFactory} allowedRoles={['operador']} />} />
      <Route path="/operator/inventory-count" component={() => <ProtectedRoute component={InventoryCountPage} allowedRoles={['operador']} />} />
      
      {/* Manager routes */}
      <Route path="/manager" component={() => <ProtectedRoute component={ManagerDashboardV2} allowedRoles={['gerente']} />} />
      
      {/* Admin routes */}
      <Route path="/admin" component={() => <ProtectedRoute component={AdminPanel} allowedRoles={['admin']} />} />
      
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
