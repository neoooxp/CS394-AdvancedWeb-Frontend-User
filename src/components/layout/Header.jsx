import { User } from 'lucide-react';

export function Header({ driverName, driverId, avatarUrl }) {
  return (
    <header className="top-header">
      <div className="user-profile-badge">
        <div className="user-info">
          <span className="user-name">{driverName || 'Driver Account'}</span>
          {driverId && <span className="user-role">Driver ID: #{driverId}</span>}
        </div>
        <div className="user-avatar">
          {avatarUrl ? (
            <img src={avatarUrl} alt={driverName} className="avatar-img" />
          ) : (
            <div className="avatar-fallback">
              <User size={20} />
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
