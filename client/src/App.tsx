import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/dashboard";
import KolDashboard from "@/pages/kol-dashboard";
import AuthPage from "@/pages/auth-page";
import ChangePasswordPage from "@/pages/change-password";
import { AuthProvider } from "@/hooks/use-auth";
import { ProtectedRoute } from "@/lib/protected-route";
import { RoleBasedRoute } from "@/lib/role-based-route";

function Router() {
  return (
    <Switch>
      <Route path="/auth" component={AuthPage} />
      <ProtectedRoute path="/change-password" component={ChangePasswordPage} />
      <Route path="/role-redirect/:refresh?" component={RoleBasedRoute} />
      
      {/* Vì đã có RoleBasedRoute để điều hướng, nên đặt trang KOL Dashboard lên trước
          để đảm bảo người dùng KOL/VIP không bị điều hướng đến trang Dashboard thông thường */}
      <ProtectedRoute path="/kol-dashboard" component={KolDashboard} />
      <ProtectedRoute path="/" component={Dashboard} />
      
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Router />
        <Toaster />
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
