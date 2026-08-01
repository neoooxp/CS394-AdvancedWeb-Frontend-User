import { Bus, Map, GraduationCap } from 'lucide-react';

export function StatCards({ stats }) {
  if (!stats) return null;

  return (
    <div className="stat-cards-grid">
      {/* Card 1: Assigned Bus */}
      <div className="stat-card">
        <div className="stat-card-header">
          <div className="stat-icon-badge blue">
            <Bus size={22} />
          </div>
          <span className="status-pill operational">
            {stats.bus_status || 'OPERATIONAL'}
          </span>
        </div>
        <div className="stat-card-body">
          <span className="stat-label">Assigned Bus</span>
          <h3 className="stat-value">{stats.assigned_bus}</h3>
        </div>
      </div>

      {/* Card 2: Today's Route */}
      <div className="stat-card">
        <div className="stat-card-header">
          <div className="stat-icon-badge orange">
            <Map size={22} />
          </div>
        </div>
        <div className="stat-card-body">
          <span className="stat-label">Today's Route</span>
          <h3 className="stat-value">{stats.today_route}</h3>
        </div>
      </div>

      {/* Card 3: Students Assigned */}
      <div className="stat-card">
        <div className="stat-card-header">
          <div className="stat-icon-badge green">
            <GraduationCap size={22} />
          </div>
        </div>
        <div className="stat-card-body">
          <span className="stat-label">Students Assigned</span>
          <h3 className="stat-value">{stats.students_assigned}</h3>
        </div>
      </div>
    </div>
  );
}
