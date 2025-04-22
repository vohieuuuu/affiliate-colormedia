import { Switch, Route } from "wouter";
import { Redirect } from "wouter";
import { Suspense, lazy } from "react";
import { Loader2 } from "lucide-react";
import { ProtectedRoute } from "@/lib/protected-route";
import KolDashboardLayout from "@/components/layout/KolDashboardLayout";

// Lazy load các trang con của KOL dashboard
const KolDashboardHome = lazy(() => import("../kol-dashboard"));
const WithdrawalPage = lazy(() => import("./WithdrawalPage"));
const ContactsPage = lazy(() => import("./contacts"));
const KpiPage = lazy(() => import("./kpi"));
const FinancePage = lazy(() => import("./finance"));

export default function KolDashboardRoutes() {
  return (
    <KolDashboardLayout>
      <Suspense fallback={
        <div className="flex flex-col gap-2 items-center justify-center min-h-[300px]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Đang tải trang...</p>
        </div>
      }>
        <Switch>
          <Route path="/kol-dashboard" exact>
            <KolDashboardHome />
          </Route>
          
          <Route path="/kol-dashboard/withdrawal">
            <WithdrawalPage />
          </Route>
          
          <Route path="/kol-dashboard/contacts">
            <ContactsPage />
          </Route>
          
          <Route path="/kol-dashboard/kpi">
            <KpiPage />
          </Route>
          
          <Route path="/kol-dashboard/finance">
            <FinancePage />
          </Route>
          
          {/* Redirect to home if no matching route */}
          <Route>
            <Redirect to="/kol-dashboard" />
          </Route>
        </Switch>
      </Suspense>
    </KolDashboardLayout>
  );
}