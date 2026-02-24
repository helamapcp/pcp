import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { EstoqueProvider } from "./contexts/EstoqueContext";
import EstoqueLogin from "./pages/EstoqueLogin";
import EstoqueOperatorPage from "./pages/EstoqueOperatorPage";
import EstoqueManagerPage from "./pages/EstoqueManagerPage";


function Router() {
  return (
    <Switch>
      <Route path="/" component={EstoqueLogin} />
      <Route path="/login" component={EstoqueLogin} />
      <Route path="/estoque-operator" component={EstoqueOperatorPage} />
      <Route path="/estoque-manager" component={EstoqueManagerPage} />
      <Route path="/404" component={NotFound} />
      {/* Final fallback route */}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider
        defaultTheme="light"
      >
        <EstoqueProvider>
          <TooltipProvider>
            <Toaster />
            <Router />
          </TooltipProvider>
        </EstoqueProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
