import { CheckCircle2, Clock, ChevronRight } from 'lucide-react';

export function TodaySchedule({ schedule = [] }) {
  return (
    <div className="dashboard-section-card">
      <div className="section-card-header">
        <h3 className="section-card-title">Today's Schedule</h3>
        <a href="#full-day" className="section-link">
          <span>View Full Day</span>
          <ChevronRight size={16} />
        </a>
      </div>

      <div className="timeline-container">
        {schedule.map((item) => {
          const isCompleted = item.status === 'completed';
          const isCurrent = item.status === 'current';

          return (
            <div key={item.id} className={`timeline-item ${item.status}`}>
              {/* Timeline indicator line & node */}
              <div className="timeline-node-wrapper">
                <span className={`timeline-dot ${item.status}`} />
                <span className="timeline-line" />
              </div>

              {/* Event Content Box */}
              <div className={`timeline-card ${item.status}`}>
                <div className="timeline-card-main">
                  <div className="timeline-card-header">
                    <span className="time-text">{item.time}</span>
                    {item.badgeText && (
                      <span className={`status-tag ${item.status}`}>
                        {item.badgeText}
                      </span>
                    )}
                  </div>

                  <h4 className="timeline-title">{item.title}</h4>
                  <p className="timeline-subtitle">{item.subtitle}</p>
                </div>

                {/* Status action or icon */}
                <div className="timeline-card-action">
                  {isCompleted && (
                    <CheckCircle2 size={22} className="completed-check-icon" />
                  )}

                  {isCurrent && item.actionButton && (
                    <button type="button" className="arrived-btn">
                      {item.actionButton}
                    </button>
                  )}

                  {!isCompleted && !isCurrent && (
                    <Clock size={20} className="pending-clock-icon" />
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
