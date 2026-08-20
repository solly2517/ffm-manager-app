import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useEffect } from "react";
import { trpc } from "./lib/trpc";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import Delegate from "./pages/Delegate";
import Help from "./pages/Help";
import Invite from "@/pages/Invite";
import WarehouseHero from "@/pages/WarehouseHero";

function Router() {
  // make sure to consider if you need authentication for certain routes
  return (
    <Switch>
      <Route path={"/"} component={Home} />
      <Route path="/delegate" component={Delegate} />
      <Route path="/help" component={Help} />
      <Route path="/invite/:token" component={Invite} />
      <Route path="/warehouse-hero" component={WarehouseHero} />
      <Route path={"/404"} component={NotFound} />
      {/* Final fallback route */}
      <Route component={NotFound} />
    </Switch>
  );
}

// NOTE: About Theme
// - First choose a default theme according to your design style (dark or light bg), than change color palette in index.css
//   to keep consistent foreground/background color across components
// - If you want to make theme switchable, pass `switchable` ThemeProvider and use `useTheme` hook

function ErrorReporter() {
  const captureClientError = trpc.monitoring.captureClientError.useMutation();
  useEffect(() => {
    const handleError = (event: Event) => {
      const detail = (event as CustomEvent<{ message: string; stack?: string; componentStack?: string; route?: string }>).detail;
      if (detail?.message) captureClientError.mutate(detail);
    };
    window.addEventListener("ffm:client-error", handleError);
    return () => window.removeEventListener("ffm:client-error", handleError);
  }, [captureClientError]);
  return null;
}

function App() {
  return (
    <>
      <ErrorReporter />
    <ErrorBoundary>
      <ThemeProvider
        defaultTheme="light"
        // switchable
      >
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
    </>
  );
}

export default App;
