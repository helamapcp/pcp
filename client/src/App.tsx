import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { PVCInventoryProvider } from "./contexts/PVCInventoryContext";
import { SnapshotInventoryProvider } from "./contexts/SnapshotInventoryContext";
import PVCLogin from "./pages/PVCLogin";
import PVCOperatorDashboard from "./pages/PVCOperatorDashboard";
import PVCManagerDashboard from "./pages/PVCManagerDashboard";
import SnapshotOperatorPage from "./pages/SnapshotOperatorPage";
import SnapshotManagerPage from "./pages/SnapshotManagerPage";


function Router() {
  return (
    <Switch>
      <Route path="/" component={PVCLogin} />
      <Route path="/pvc-login" component={PVCLogin} />
      <Route path="/pvc-operator" component={PVCOperatorDashboard} />
      <Route path="/pvc-manager" component={PVCManagerDashboard} />
      <Route path="/snapshot-operator" component={SnapshotOperatorPage} />
      <Route path="/snapshot-manager" component={SnapshotManagerPage} />
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
        <PVCInventoryProvider>
          <SnapshotInventoryProvider>
            <TooltipProvider>
              <Toaster />
              <Router />
            </TooltipProvider>
          </SnapshotInventoryProvider>
        </PVCInventoryProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
