import React from 'react';
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch, useLocation } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { EstoqueProvider } from "./contexts/EstoqueContext";
import { UserManagementProvider, useUserManagement } from "./contexts/UserManagementContext";
import EstoqueLogin from "./pages/EstoqueLogin";
import EstoqueOperatorPage from "./pages/EstoqueOperatorPage";
import EstoqueManagerPage from "./pages/EstoqueManagerPage";
import AdminPanel from "./pages/AdminPanel";

function ProtectedRoute({ component: Component, requiredRole }: { component: React.ComponentType; requiredRole?: string }) {
  const { currentUser } = useUserManagement();
  const [, setLocation] = useLocation();

  React.useEffect(() => {
    if (!currentUser) {
      setLocation('/login');
    } else if (requiredRole && currentUser.role !== requiredRole) {
      setLocation('/404');
    }
  }, [currentUser, requiredRole, setLocation]);

  if (!currentUser) return null;
  if (requiredRole && currentUser.role !== requiredRole) return null;

  return <Component />;
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={EstoqueLogin} />
      <Route path="/login" component={EstoqueLogin} />
      <Route path="/operator" component={() => <ProtectedRoute component={EstoqueOperatorPage} requiredRole="operador" />} />
      <Route path="/manager" component={() => <ProtectedRoute component={EstoqueManagerPage} requiredRole="gerente" />} />
      <Route path="/admin" component={() => <ProtectedRoute component={AdminPanel} requiredRole="admin" />} />
      <Route path="/404" component={NotFound} />
      {/* Final fallback route */}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <UserManagementProvider>
          <EstoqueProvider>
            <TooltipProvider>
              <Toaster />
              <Router />
            </TooltipProvider>
          </EstoqueProvider>
        </UserManagementProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
