import { useState } from 'react';
import { X, AlertTriangle, Plus, Loader2 } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { fetchBuses } from '../api/maintenanceApi';

const PRIORITY_OPTIONS = [
  { value: 'Low', label: 'Low (Routine maintenance)' },
  { value: 'Medium', label: 'Medium (Routine maintenance)' },
  { value: 'High', label: 'High (Urgent repair)' },
];

const SYSTEM_OPTIONS = [
  'Brakes',
  'Engine',
  'Transmission',
  'Electrical',
  'HVAC',
  'Tires',
  'Body/Exterior',
];

export function MaintenanceModal({ isOpen, onClose, onSuccess }) {
  const { data: buses = [] } = useQuery({
    queryKey: ['buses'],
    queryFn: fetchBuses,
    enabled: isOpen,
  });

  const [form, setForm] = useState({
    bus_id: '',
    issue: '',
    priority: 'Medium',
    categories: [],
    odometer_reading: '',
    photos: [],
  });
  const [photoInput, setPhotoInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);

  if (!isOpen) return null;

  function toggleCategory(cat) {
    setForm((prev) => ({
      ...prev,
      categories: prev.categories.includes(cat)
        ? prev.categories.filter((c) => c !== cat)
        : [...prev.categories, cat],
    }));
  }

  function addPhoto() {
    const url = photoInput.trim();
    if (!url) return;
    setForm((prev) => ({ ...prev, photos: [...prev.photos, url] }));
    setPhotoInput('');
  }

  function removePhoto(idx) {
    setForm((prev) => ({ ...prev, photos: prev.photos.filter((_, i) => i !== idx) }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.bus_id || !form.issue.trim()) return;

    setIsSubmitting(true);
    setError(null);

    const diagnosticDetails = form.odometer_reading
      ? { odometer: Number(form.odometer_reading) }
      : null;

    const payload = {
      bus_id: Number(form.bus_id),
      issue: form.issue.trim(),
      priority: form.priority,
      categories: form.categories,
      photos: form.photos,
      diagnostic_details: diagnosticDetails,
    };

    try {
      await onSuccess(payload);
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to submit request. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <>
      <div className="modal-backdrop" onClick={onClose} />
      <div className="modal-container" role="dialog" aria-modal="true" aria-labelledby="modal-title">
        <div className="modal-form-card">
          <div className="modal-header">
            <h2 id="modal-title" className="modal-title">Log New Repair Request</h2>
            <button type="button" className="modal-close-btn" onClick={onClose} aria-label="Close">
              <X size={18} />
            </button>
          </div>

          <form className="modal-form" onSubmit={handleSubmit}>
            <div className="form-field">
              <label className="field-label" htmlFor="bus-select">Select Bus</label>
              <div className="select-wrapper">
                <select
                  id="bus-select"
                  value={form.bus_id}
                  onChange={(e) => setForm((p) => ({ ...p, bus_id: e.target.value }))}
                  required
                  className="form-select"
                >
                  <option value="" disabled>-- Select a Bus --</option>
                  {buses.map((bus) => (
                    <option key={bus.bus_id || bus._id} value={bus.bus_id || bus._id}>
                      {bus.bus_number ? `Bus ${bus.bus_number}` : `${bus.manufacturer || ''} ${bus.model || ''}`.trim() || 'Unknown Bus'}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="form-field">
              <label className="field-label" htmlFor="issue-input">Issue Description</label>
              <div className="input-with-icon">
                <AlertTriangle size={16} className="input-icon-left-alt" />
                <input
                  id="issue-input"
                  type="text"
                  value={form.issue}
                  onChange={(e) => setForm((p) => ({ ...p, issue: e.target.value }))}
                  placeholder="e.g. Transmission fluid leak detected during morning inspection."
                  required
                  className="form-input has-left-icon"
                />
              </div>
            </div>

            <div className="form-field">
              <label className="field-label" htmlFor="priority-select">Priority Level</label>
              <div className="select-wrapper">
                <select
                  id="priority-select"
                  value={form.priority}
                  onChange={(e) => setForm((p) => ({ ...p, priority: e.target.value }))}
                  className="form-select"
                >
                  {PRIORITY_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="form-field">
              <label className="field-label">Affected Vehicle Systems (MongoDB Document Array)</label>
              <div className="system-chips">
                {SYSTEM_OPTIONS.map((sys) => {
                  const selected = form.categories.includes(sys);
                  return (
                    <button
                      key={sys}
                      type="button"
                      onClick={() => toggleCategory(sys)}
                      className={`system-chip ${selected ? 'selected' : ''}`}
                    >
                      {selected ? '✓' : '+'} {sys}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="form-field">
              <label className="field-label" htmlFor="odometer-input">
                Diagnostic Odometer Reading (Optional Telemetry)
              </label>
              <input
                id="odometer-input"
                type="number"
                value={form.odometer_reading}
                onChange={(e) => setForm((p) => ({ ...p, odometer_reading: e.target.value }))}
                placeholder="e.g. 45200"
                className="form-input"
              />
            </div>

            <div className="form-field">
              <label className="field-label">Damage Evidence Photo URLs (MongoDB Embedded Array)</label>
              <div className="photo-input-row">
                <input
                  type="url"
                  value={photoInput}
                  onChange={(e) => setPhotoInput(e.target.value)}
                  placeholder="https://example.com/damage-photo.jpg"
                  className="form-input"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') { e.preventDefault(); addPhoto(); }
                  }}
                />
                <button type="button" className="add-photo-btn" onClick={addPhoto}>
                  <Plus size={16} /> Add Photo
                </button>
              </div>
              {form.photos.length > 0 && (
                <ul className="photo-list">
                  {form.photos.map((url, idx) => (
                    <li key={idx} className="photo-item">
                      <span className="photo-url">{url}</span>
                      <button type="button" className="remove-photo-btn" onClick={() => removePhoto(idx)}>
                        Remove
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {error && (
              <div className="status-alert error">{error}</div>
            )}

            <div className="modal-actions">
              <button type="button" className="cancel-btn" onClick={onClose}>
                Cancel
              </button>
              <button type="submit" className="submit-btn" disabled={isSubmitting}>
                {isSubmitting ? <><Loader2 size={16} className="btn-spinner" /> Submitting...</> : 'Log Repair'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}
