import { useState } from 'react';
import { Wrench, Plus, Clock, AlertCircle, Bus } from 'lucide-react';
import { DashboardLayout } from '../../../components/layout/DashboardLayout';
import { useMaintenanceRequests, useCreateMaintenanceRequest } from '../hooks/useMaintenanceRequests';
import { MaintenanceModal } from '../components/MaintenanceModal';

function StatusPill({ label, tone }) {
  const toneClass = tone === 'success' ? 'success-pill' : tone === 'warning' ? 'warning-pill' : 'neutral-pill';
  return <span className={`status-pill ${toneClass}`}>{label}</span>;
}

export function MaintenancePage({ onLogout }) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { data: requests = [], isLoading, error } = useMaintenanceRequests();
  const createMutation = useCreateMaintenanceRequest();

  async function handleCreate(payload) {
    await createMutation.mutateAsync(payload);
  }

  return (
    <DashboardLayout onLogout={onLogout}>
      <div className="maintenance-page">
        {/* Header */}
        <div className="page-header">
          <div>
            <p className="page-breadcrumb">Operations / Maintenance Requests</p>
            <h1 className="page-title">Maintenance Requests</h1>
          </div>
          <button className="new-request-btn" onClick={() => setIsModalOpen(true)}>
            <Plus size={18} />
            New Request
          </button>
        </div>

        {/* Modal */}
        <MaintenanceModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSuccess={handleCreate}
        />

        {/* Content */}
        {isLoading ? (
          <div className="loading-state">
            <div className="spinner-large" />
            <p>Loading maintenance requests...</p>
          </div>
        ) : error ? (
          <div className="status-alert error">
            <AlertCircle size={16} />
            Failed to load maintenance requests. Please refresh.
          </div>
        ) : (
          <div className="requests-section">
            <div className="section-header">
              <h2 className="section-title">
                Pending Requests
                {requests.length > 0 && (
                  <span className="request-count">({requests.length})</span>
                )}
              </h2>
            </div>

            <div className="requests-list">
              {requests.length > 0 ? (
                requests.map((req) => (
                  <div key={req._id || req.mongo_id} className="request-card">
                    <div className="request-card-body">
                      <div className="request-title-row">
                        <span className="request-issue">{req.issue}</span>
                        <StatusPill
                          label={req.status === 'Resolved' ? 'Resolved' : 'Pending'}
                          tone={req.status === 'Resolved' ? 'success' : 'warning'}
                        />
                      </div>
                      <div className="request-meta">
                        {req.bus_id && (
                          <span className="meta-item">
                            <Bus size={13} />
                            Bus ID: {req.bus_id}
                          </span>
                        )}
                        {req.priority && (
                          <span className="meta-item">Priority: {req.priority}</span>
                        )}
                        {req.created_at && (
                          <span className="meta-item">
                            <Clock size={13} />
                            {new Date(req.created_at).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                      {req.categories && req.categories.length > 0 && (
                        <div className="request-systems">
                          {req.categories.map((cat) => (
                            <span key={cat} className="system-tag">{cat}</span>
                          ))}
                        </div>
                      )}
                      {req.diagnostic_details?.odometer && (
                        <p className="request-odometer">
                          Odometer: {req.diagnostic_details.odometer}
                        </p>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="empty-state">
                  <Wrench size={40} className="empty-icon" />
                  <h3>No maintenance requests</h3>
                  <p>All clear! No pending maintenance issues.</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
