import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom"
import { Toaster as Sonner } from "@/components/ui/sonner"
import { Toaster } from "@/components/ui/toaster"
import { TooltipProvider } from "@/components/ui/tooltip"
import { AuthProvider, useAuth } from "@/contexts/AuthContext"
import { ThemeProvider } from "@/contexts/ThemeContext"

import EmployeeLayout from "@/components/EmployeeLayout"
import AdminLayout from "@/components/AdminLayout"

import CompanyLogin from "@/pages/CompanyLogin"
import MasterLogin from "@/pages/MasterLogin"
import KioskPage from "@/pages/KioskPage"

import EmployeeDashboard from "@/pages/EmployeeDashboard"
import TimeHistory from "@/pages/TimeHistory"
import BankHours from "@/pages/BankHours"
import TimeRequests from "@/pages/TimeRequests"

import AdminDashboard from "@/pages/AdminDashboard"
import AdminEmployees from "@/pages/AdminEmployees"
import AdminSchedules from "@/pages/AdminSchedules"
import AdminReports from "@/pages/AdminReports"
import AdminSettings from "@/pages/AdminSettings"

import MasterDashboard from "@/pages/MasterDashboard"
import MasterTenants from "@/pages/MasterTenants"

import NotFound from "@/pages/NotFound"

const queryClient = new QueryClient()

const LoadingScreen = () => (
  <div className="min-h-screen flex items-center justify-center bg-background">
    <div className="text-center">
      <div className="w-14 h-14 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
      <p className="text-muted-foreground font-medium">Carregando...</p>
    </div>
  </div>
)

const AppRoutes = () => {
  const { user, loading } = useAuth()

  if (loading) return <LoadingScreen />

  if (!user) {
    return (
      <Routes>
        <Route path="/kiosk" element={<KioskPage />} />
        <Route path="/admin" element={<MasterLogin />} />
        <Route path="/master" element={<MasterLogin />} />
        <Route path="*" element={<CompanyLogin />} />
      </Routes>
    )
  }

  if (user.role === "master") {
    return (
      <Routes>
        <Route path="/master" element={<AdminLayout />}>
          <Route index element={<MasterDashboard />} />
          <Route path="empresas" element={<MasterTenants />} />
        </Route>
        <Route path="/kiosk" element={<KioskPage />} />
        <Route path="*" element={<Navigate to="/master" replace />} />
      </Routes>
    )
  }

  if (user.role === "admin" && user.tenant_slug !== "master") {
    return (
      <Routes>
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<AdminDashboard />} />
          <Route path="funcionarios" element={<AdminEmployees />} />
          <Route path="escalas" element={<AdminSchedules />} />
          <Route path="relatorios" element={<AdminReports />} />
          <Route path="configuracoes" element={<AdminSettings />} />
        </Route>
        <Route path="/app" element={<EmployeeLayout />}>
          <Route index element={<EmployeeDashboard />} />
          <Route path="historico" element={<TimeHistory />} />
          <Route path="banco-horas" element={<BankHours />} />
          <Route path="solicitacoes" element={<TimeRequests />} />
        </Route>
        <Route path="/kiosk" element={<KioskPage />} />
        <Route path="*" element={<Navigate to="/admin" replace />} />
      </Routes>
    )
  }

  return (
    <Routes>
      <Route path="/app" element={<EmployeeLayout />}>
        <Route index element={<EmployeeDashboard />} />
        <Route path="historico" element={<TimeHistory />} />
        <Route path="banco-horas" element={<BankHours />} />
        <Route path="solicitacoes" element={<TimeRequests />} />
      </Route>
      <Route path="/kiosk" element={<KioskPage />} />
      <Route path="*" element={<Navigate to="/app" replace />} />
    </Routes>
  )
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <AuthProvider>
        <ThemeProvider>
          <BrowserRouter>
            <AppRoutes />
          </BrowserRouter>
        </ThemeProvider>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
)

export default App
