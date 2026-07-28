import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { useDriverDashboard } from '../../features/dashboard/hooks/useDriverDashboard';

export function DashboardLayout({
  children,
  onLogout,
  onReportIncident,
  driverInfo,
}) {
  const { data } = useDriverDashboard();
  const currentDriver = driverInfo || data?.driver;

  const handleReportIncident = onReportIncident || (() => alert('Incident Reporting Dialog Opened'));

  return (
    <div className="app-layout">
      {/* Reusable Sidebar with React Router */}
      <Sidebar
        onLogout={onLogout}
        onReportIncident={handleReportIncident}
      />

      <div className="main-wrapper">
        {/* Reusable Top Header */}
        <Header
          driverName={currentDriver?.name}
          driverId={currentDriver?.driver_id || currentDriver?.id}
          avatarUrl={currentDriver?.avatar}
        />

        {/* Page Main Content Area */}
        <main className="content-area">{children}</main>
      </div>
    </div>
  );
}

