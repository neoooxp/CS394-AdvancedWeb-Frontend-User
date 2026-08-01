import { Calendar as CalendarIcon } from 'lucide-react';
import { DashboardLayout } from '../../../components/layout/DashboardLayout';
import { useDriverDashboard } from '../hooks/useDriverDashboard';
import { StatCards } from '../components/StatCards';
import { UpcomingStopsTable } from '../components/UpcomingStopsTable';

export function DriverDashboardPage({ onLogout }) {
  const { data, isLoading, error } = useDriverDashboard();

  return (
    <DashboardLayout onLogout={onLogout} driverInfo={data?.driver}>
      {isLoading ? (
        <div className="dashboard-loading-state">
          <div className="spinner-large" />
          <p>Loading your shift dashboard...</p>
        </div>
      ) : error ? (
        <div className="status-alert error">
          Failed to load dashboard data. Please refresh or check server connection.
        </div>
      ) : (
        <div className="dashboard-content-flow">
          {/* Welcome Banner */}
          <div className="welcome-banner">
            <div className="welcome-text">
              <h2 className="greeting-title">
                Good Morning, {data?.driver?.name?.split(' ')[0] || 'John'}
              </h2>
              <p className="greeting-subtitle">
                Your shift started at {data?.driver?.shift_start || '6:30 AM'}. Stay safe on the road.
              </p>
            </div>
            <div className="date-badge">
              <CalendarIcon size={18} />
              <span>{data?.driver?.date_str || 'Monday, Oct 23rd, 2023'}</span>
            </div>
          </div>

          {/* Stat Overview Cards */}
          <StatCards stats={data?.stats} />

          {/* Route Summary & Upcoming Stops */}
          <UpcomingStopsTable
            routeSummary={data?.route_summary}
            stops={data?.upcoming_stops}
          />
        </div>
      )}
    </DashboardLayout>
  );
}


