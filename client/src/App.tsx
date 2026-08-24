import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useEffect, useRef } from "react";
import { trpc } from "./lib/trpc";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { NotificationCenter } from "./components/NotificationCenter";
import { ThemeProvider } from "./contexts/ThemeContext";
import { LanguageProvider, useLanguage } from "./contexts/LanguageContext";
import Home from "./pages/Home";
import Delegate from "./pages/Delegate";
import Help from "./pages/Help";
import Invite from "@/pages/Invite";
import WarehouseHero from "@/pages/WarehouseHero";
import SurgeryCalendar from "@/pages/SurgeryCalendar";
import AdminDiagnostics from "@/pages/AdminDiagnostics";
import SurgeryReadiness from "@/pages/SurgeryReadiness";
import DelegateWorkLog from "@/pages/DelegateWorkLog";
import TravelExpenses from "@/pages/TravelExpenses";

function Router() {
  // make sure to consider if you need authentication for certain routes
  return (
    <Switch>
      <Route path={"/"} component={Home} />
      <Route path="/delegate" component={Delegate} />
      <Route path="/help" component={Help} />
      <Route path="/invite/:token" component={Invite} />
      <Route path="/warehouse-hero" component={WarehouseHero} />
      <Route path="/surgery-calendar" component={SurgeryCalendar} />
      <Route path="/admin-diagnostics" component={AdminDiagnostics} />
      <Route path="/surgery-readiness" component={SurgeryReadiness} />
      <Route path="/work-log" component={DelegateWorkLog} />
      <Route path="/travel-expenses" component={TravelExpenses} />
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
  const recentReports = useRef(new Map<string, number>());
  useEffect(() => {
    const handleError = (event: Event) => {
      const detail = (event as CustomEvent<{ message: string; stack?: string; componentStack?: string; route?: string }>).detail;
      if (!detail?.message || /monitoring\.captureClientError|Unexpected token .*not valid JSON|Failed to execute 'json' on 'Response'|non-JSON response/i.test(detail.message)) return;
      const key = `${detail.route ?? ""}:${detail.message.slice(0, 180)}`;
      const now = Date.now();
      if ((recentReports.current.get(key) ?? 0) > now - 30_000) return;
      recentReports.current.set(key, now);
      captureClientError.mutate(detail, { onError: () => undefined });
    };
    window.addEventListener("ffm:client-error", handleError);
    return () => window.removeEventListener("ffm:client-error", handleError);
  }, [captureClientError]);
  return null;
}

function SavedLanguagePreferenceHydrator() {
  const { data: user } = trpc.auth.me.useQuery();
  const { setLanguage } = useLanguage();
  const hydratedIdentity = useRef<string | null>(null);

  useEffect(() => {
    if (!user?.id || !user.defaultLanguage) return;
    const identity = `${user.id}:${user.defaultLanguage}`;
    if (hydratedIdentity.current === identity) return;
    hydratedIdentity.current = identity;
    setLanguage(user.defaultLanguage);
  }, [setLanguage, user?.defaultLanguage, user?.id]);

  return null;
}

function App() {
  return (
    <>
      <ErrorReporter />
    <ErrorBoundary>
      <LanguageProvider>
        <SavedLanguagePreferenceHydrator />
        <ThemeProvider
          defaultTheme="light"
          // switchable
        >
          <TooltipProvider>
            <Toaster />
            <NotificationCenter />
            <Router />
          </TooltipProvider>
        </ThemeProvider>
      </LanguageProvider>
    </ErrorBoundary>
    </>
  );
}

export default App;
