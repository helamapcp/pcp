import React from 'react';
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch, useLocation } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import EstoqueLogin from "./pages/EstoqueLogin";
import EstoqueOperatorPage from "./pages/EstoqueOperatorPage";
import EstoqueManagerPage from "./pages/EstoqueManagerPage";
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
      <Route path="/operator" component={() => <ProtectedRoute component={EstoqueOperatorPage} allowedRoles={['operador']} />} />
      <Route path="/manager" component={() => <ProtectedRoute component={EstoqueManagerPage} allowedRoles={['gerente']} />} />
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
