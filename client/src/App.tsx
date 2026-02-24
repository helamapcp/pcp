import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { InventoryProvider } from "./contexts/InventoryContext";
import Login from "./pages/Login";
import OperatorDashboard from "./pages/OperatorDashboard";
import ManagerDashboard from "./pages/ManagerDashboard";


function Router() {
  return (
    <Switch>
      <Route path="/" component={Login} />
      <Route path="/login" component={Login} />
      <Route path="/operator" component={OperatorDashboard} />
      <Route path="/manager" component={ManagerDashboard} />
      <Route path="/404" component={NotFound} />
      {/* Final fallback route */}
      <Route component={NotFound} />
    </Switch>
  );
}

// NOTE: About Theme
// - First choose a default theme according to your design style (dark or light bg), than change color palette in index.css
//   to keep consistent foreground/background color across components
// - If you want to make theme switchable, pass `switchable` ThemeProvider and use `useTheme` hook

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider
        defaultTheme="light"
        // switchable
      >
        <InventoryProvider>
          <TooltipProvider>
            <Toaster />
            <Router />
          </TooltipProvider>
        </InventoryProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
