import { User } from 'lucide-react';

export function UpcomingStopsTable({ routeSummary, stops = [] }) {
  return (
    <div className="dashboard-section-card no-padding">
      {/* Route Summary Top Header Bar */}
      <div className="route-summary-bar">
        <h4 className="summary-title">Route Summary</h4>
        <div className="summary-metrics">
          <div className="metric-item">
            <span className="metric-label">TOTAL DISTANCE</span>
            <span className="metric-value">{routeSummary?.total_distance || '12.4 mi'}</span>
          </div>
          <div className="metric-item">
            <span className="metric-label">EST. DURATION</span>
            <span className="metric-value">{routeSummary?.est_duration || '45 mins'}</span>
          </div>
        </div>
      </div>

      {/* Upcoming Stops Content */}
      <div className="stops-table-container">
        <h3 className="stops-section-title">Upcoming Stops</h3>

        <div className="table-responsive">
          <table className="stops-table">
            <thead>
              <tr>
                <th>Stop Name</th>
                <th>Est. Arrival</th>
                <th>Students</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {stops.map((stop) => (
                <tr key={stop.id}>
                  <td>
                    <div className="stop-name-col">
                      <span className="stop-title">{stop.name}</span>
                      <span className="stop-subtext">{stop.subtext}</span>
                    </div>
                  </td>
                  <td>
                    <span className="arrival-time">{stop.time}</span>
                  </td>
                  <td>
                    {stop.type === 'dropoff' ? (
                      <span className="student-pill dropoff">Drop-off</span>
                    ) : (
                      <span className="student-pill pickup">
                        <User size={13} />
                        <span>{stop.students}</span>
                      </span>
                    )}
                  </td>
                  <td>
                    <button type="button" className="details-action-btn">
                      Details
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
