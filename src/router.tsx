// ============================================================================
// Router Configuration
// ============================================================================

import { createBrowserRouter, Navigate } from "react-router-dom";
import { AuthGuard } from "@/features/auth/components/AuthGuard";

// Auth pages
import { SignupPage } from "@/features/auth/components/SignupPage";
import { LoginPage } from "@/features/auth/components/LoginPage";
import { ResetPasswordPage } from "@/features/auth/components/ResetPasswordPage";
import { OnboardingPage } from "@/features/auth/components/OnboardingPage";
import { AcceptInvitePage } from "@/features/auth/components/AcceptInvitePage";

// Workspace pages
import { DashboardLayout } from "@/features/workspaces/components/DashboardLayout";
import { DashboardPage } from "@/features/workspaces/components/DashboardPage";
import { MembersPage } from "@/features/workspaces/components/MembersPage";

// Integration pages
import { IntegrationsPage } from "@/features/integrations/components/IntegrationsPage";

// Destination pages
import { DestinationsPage } from "@/features/destinations/components/DestinationsPage";
import { RoutesPage } from "@/features/destinations/components/RoutesPage";

// Mapping pages
import { MappingsPage } from "@/features/mappings/components/MappingsPage";

// Delivery pages
import { DeliveryPage } from "@/features/delivery/components/DeliveryPage";

// WhatsApp pages
import { WhatsAppPage } from "@/features/whatsapp/components/WhatsAppPage";

// Logs & Monitoring pages
import { LogsPage } from "@/features/logs/components/LogsPage";
import { AlertsPage } from "@/features/logs/components/AlertsPage";

// Reports pages
import { ReportsPage } from "@/features/reports/components/ReportsPage";

// Billing pages
import { BillingPage } from "@/features/billing/components/BillingPage";

export const router = createBrowserRouter([
  // ── Public auth routes ──
  { path: "/auth/signup", element: <SignupPage /> },
  { path: "/auth/login", element: <LoginPage /> },
  { path: "/auth/reset-password", element: <ResetPasswordPage /> },

  // ── Invite acceptance ──
  { path: "/invite/accept", element: <AcceptInvitePage /> },
  { path: "/invite/error", element: <AcceptInvitePage /> },

  // ── Onboarding (authenticated, no workspace required) ──
  {
    path: "/onboarding",
    element: (
      <AuthGuard>
        <OnboardingPage />
      </AuthGuard>
    ),
  },

  // ── Dashboard (authenticated, workspace required) ──
  {
    path: "/workspace/:workspaceId",
    element: (
      <AuthGuard requireWorkspace>
        <DashboardLayout />
      </AuthGuard>
    ),
    children: [
      { index: true, element: <DashboardPage /> },
      { path: "members", element: <MembersPage /> },
      { path: "integrations", element: <IntegrationsPage /> },
      { path: "destinations", element: <DestinationsPage /> },
      { path: "routes", element: <RoutesPage /> },
      { path: "mappings", element: <MappingsPage /> },
      { path: "delivery", element: <DeliveryPage /> },
      { path: "whatsapp", element: <WhatsAppPage /> },
      { path: "logs", element: <LogsPage /> },
      { path: "alerts", element: <AlertsPage /> },
      { path: "reports", element: <ReportsPage /> },
      { path: "billing", element: <BillingPage /> },
      // { path: "logs", element: <LogsPage /> },
      // Feature 9 routes (to be added)
      // { path: "settings", element: <SettingsPage /> },
    ],
  },

  // ── Redirects ──
  { path: "/dashboard", element: <Navigate to="/onboarding" replace /> },
  { path: "/", element: <Navigate to="/auth/login" replace /> },
  { path: "*", element: <Navigate to="/" replace /> },
]);
