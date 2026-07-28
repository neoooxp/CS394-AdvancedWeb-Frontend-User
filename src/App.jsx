import { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Bus } from 'lucide-react';
import { LoginForm } from './features/auth/components/LoginForm';
import { DriverDashboardPage } from './features/dashboard/pages/DriverDashboardPage';
import { MyRoutePage } from './features/dashboard/pages/MyRoutePage';
import { DriverSchedulePage } from './features/dashboard/pages/DriverSchedulePage';
import { DashboardLayout } from './components/layout/DashboardLayout';

// Initialize TanStack Query client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function ModulePlaceholder({ title, onLogout }) {
  return (
    <DashboardLayout onLogout={onLogout}>
      <div className="tab-placeholder-card">
        <h2>{title} Module</h2>
        <p>This page is accessible via React Router. Path: <strong>{window.location.pathname}</strong></p>
      </div>
    </DashboardLayout>
  );
}

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    const hasToken = !!(
      localStorage.getItem('sbms_auth_token') ||
      sessionStorage.getItem('sbms_auth_token')
    );
    const role = localStorage.getItem('sbms_role') || sessionStorage.getItem('sbms_role');
    return hasToken && role === 'driver';
  });

  const handleLoginSuccess = () => {
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    localStorage.removeItem('sbms_auth_token');
    localStorage.removeItem('sbms_user');
    sessionStorage.removeItem('sbms_auth_token');
    sessionStorage.removeItem('sbms_user');
    setIsAuthenticated(false);
  };

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        {!isAuthenticated ? (
          <div className="login-portal-wrapper">
            <main className="portal-container">
              <header className="portal-header">
                <div className="logo-badge" aria-label="SBMS Logo Icon">
                  <Bus size={28} strokeWidth={2.2} />
                </div>
                <h1 className="logo-title">SBMS</h1>
                <span className="logo-subtitle">DRIVER PORTAL</span>
              </header>
              <LoginForm onLoginSuccess={handleLoginSuccess} />
            </main>
          </div>
        ) : (
          <Routes>
            <Route path="/" element={<DriverDashboardPage onLogout={handleLogout} />} />
            <Route path="/dashboard" element={<DriverDashboardPage onLogout={handleLogout} />} />
            <Route path="/my-route" element={<MyRoutePage onLogout={handleLogout} />} />
            <Route path="/attendance" element={<ModulePlaceholder title="Attendance" onLogout={handleLogout} />} />
            <Route path="/maintenance" element={<ModulePlaceholder title="Maintenance Requests" onLogout={handleLogout} />} />
            <Route path="/schedule" element={<DriverSchedulePage onLogout={handleLogout} />} />
            <Route path="/profile" element={<ModulePlaceholder title="Profile" onLogout={handleLogout} />} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        )}
      </BrowserRouter>
    </QueryClientProvider>
  );
}

