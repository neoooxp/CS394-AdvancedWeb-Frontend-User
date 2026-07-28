import { useState, useMemo } from 'react';
import {
  Navigation,
  Bus,
  Clock,
  MapPin,
  Users,
  Search,
  CheckCircle2,
  XCircle,
  AlertCircle,
  RefreshCw,
  ChevronRight,
  ChevronLeft,
  ArrowLeft,
  ShieldCheck,
  Map as MapIcon,
  Check
} from 'lucide-react';
import { useDriverRoute } from '../hooks/useDriverRoute';
import { DashboardLayout } from '../../../components/layout/DashboardLayout';
import { RouteMap } from '../components/RouteMap';

export function MyRoutePage({ onLogout }) {
  const { data, isLoading, error, refetch, isRefetching, markAttendance, isUpdatingAttendance } = useDriverRoute();
  const [selectedRouteId, setSelectedRouteId] = useState(null);
  const [selectedStopId, setSelectedStopId] = useState(null);
  const [routeMode, setRouteMode] = useState('pickup'); // 'pickup' | 'dropoff'
  const [localAttendance, setLocalAttendance] = useState({});
  const [completedStops, setCompletedStops] = useState({});
  const [submittingStopId, setSubmittingStopId] = useState(null);
  const [submitFeedback, setSubmitFeedback] = useState({});

  const assignedRoutesList = data?.assignedRoutes || (data ? [data] : []);
  const activeRouteData = selectedRouteId 
    ? (assignedRoutesList.find(r => String(r.route_id) === String(selectedRouteId)) || assignedRoutesList[0])
    : null;
  const rawStops = activeRouteData?.stops || [];

  // Automatically reverse stop order for Afternoon Drop-Off routes
  const stops = useMemo(() => {
    if (routeMode === 'dropoff') {
      return [...rawStops].reverse();
    }
    return rawStops;
  }, [rawStops, routeMode]);

  const handleStatusChange = (studentId, status, routeId) => {
    setLocalAttendance((prev) => ({ ...prev, [studentId]: status }));

    markAttendance(
      { studentId, status, routeId },
      {
        onError: (err) => {
          alert(`Failed to update attendance status on server: ${err.message}`);
        },
      }
    );
  };

  const handleMarkAllForStop = (stop, idx) => {
    if (!stop || !stop.students) return;
    const isDropoffAction = routeMode === 'dropoff' ? idx > 0 : idx === stops.length - 1;
    const targetStatus = isDropoffAction ? 'Dropped Off' : 'Boarded';
    stop.students.forEach((st) => {
      handleStatusChange(st.student_id, targetStatus, activeRouteData.route_id);
    });
  };

  const handleSingleStopCheckIn = (stop, stopIdx) => {
    if (!stop) return;
    const stopKey = stop.stop_id || stopIdx;

    setSubmittingStopId(stopKey);

    const isDropoffAction = routeMode === 'dropoff' ? stopIdx > 0 : stopIdx === stops.length - 1;
    const defaultStatus = isDropoffAction ? 'Dropped Off' : 'Boarded';

    if (stop.students && stop.students.length > 0) {
      stop.students.forEach((st) => {
        const statusToApply = localAttendance[st.student_id] || st.status || defaultStatus;
        handleStatusChange(st.student_id, statusToApply, activeRouteData.route_id);
      });
    }

    setTimeout(() => {
      setSubmittingStopId(null);
      setCompletedStops((prev) => ({ ...prev, [stopKey]: true }));
      setSubmitFeedback((prev) => ({ ...prev, [stopKey]: `Stop #${stopIdx + 1} check-in completed!` }));
      setTimeout(() => {
        setSubmitFeedback((prev) => ({ ...prev, [stopKey]: '' }));
      }, 4000);
    }, 600);
  };

  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="my-route-loading">
          <div className="spinner-large" />
          <p>Fetching your assigned route & stop manifest...</p>
        </div>
      );
    }

    if (error) {
      return (
        <div className="status-alert error">
          <AlertCircle size={20} />
          <span>Failed to load route data. Please check your internet connection or backend server.</span>
          <button onClick={() => refetch()} className="retry-btn">Retry</button>
        </div>
      );
    }

    if (data?.assigned === false || assignedRoutesList.length === 0) {
      return (
        <div className="tab-placeholder-card" style={{ padding: '60px 20px' }}>
          <Navigation size={48} style={{ color: 'var(--text-sub)', marginBottom: '16px' }} />
          <h2>No Route Assigned</h2>
          <p style={{ marginTop: '8px', color: 'var(--text-muted)' }}>
            Driver <strong>{data?.driver?.name} (ID: #{data?.driver?.user_id})</strong> does not currently have an active route assignment in the database.
          </p>
          <button onClick={() => refetch()} className="refresh-route-btn" style={{ marginTop: '20px' }}>
            <RefreshCw size={16} /> Re-check API Assignment
          </button>
        </div>
      );
    }

    /* VIEW 1: All Assigned Routes Selection Page */
    if (!selectedRouteId) {
      return (
        <div className="dashboard-content-flow" style={{ textAlign: 'left' }}>
          {/* Header Bar */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px', marginBottom: '16px' }}>
            <div>
              <h2 style={{ fontSize: '26px', fontWeight: 800, color: 'var(--text-dark)', margin: 0 }}>
                My Assigned Routes
              </h2>
              <p style={{ fontSize: '13px', color: 'var(--icon-color)', margin: '4px 0 0 0' }}>
                You have <strong>{assignedRoutesList.length} Active Route(s)</strong> assigned. Click a route card to view its live map, stop sequence, and passenger manifest.
              </p>
            </div>
            <button
              type="button"
              onClick={() => refetch()}
              className={`refresh-route-btn ${isRefetching ? 'spinning' : ''}`}
              style={{ padding: '8px 14px', borderRadius: '10px', fontSize: '13px', fontWeight: 700 }}
            >
              <RefreshCw size={16} />
              <span>Refresh Routes</span>
            </button>
          </div>

          {/* Route Cards Grid */}
          <div 
            style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', 
              gap: '20px', 
              marginTop: '16px' 
            }}
          >
            {assignedRoutesList.map((rt, idx) => {
              const isMidDay = rt.timeWindow.includes('11:') || rt.timeWindow.includes('12:') || rt.timeWindow.includes('01:');
              const isAfternoon = rt.timeWindow.includes('02:') || rt.timeWindow.includes('03:') || rt.timeWindow.includes('04:');
              
              let borderClr = '#6366f1';
              let badgeClr = '#4f46e5';
              let bgBadge = '#e0e7ff';
              let shiftLabel = 'Morning Shift';

              if (isAfternoon) {
                borderClr = '#d97706';
                badgeClr = '#92400e';
                bgBadge = '#fef3c7';
                shiftLabel = 'Afternoon Shift';
              } else if (isMidDay) {
                borderClr = '#f59e0b';
                badgeClr = '#b45309';
                bgBadge = '#fef3c7';
                shiftLabel = 'Mid-Day Shift';
              }

              return (
                <div
                  key={rt.route_id || idx}
                  onClick={() => {
                    setSelectedRouteId(rt.route_id);
                    setSelectedStopId(null);
                  }}
                  style={{
                    backgroundColor: '#ffffff',
                    borderRadius: '16px',
                    padding: '20px',
                    border: '1px solid rgba(197, 197, 211, 0.4)',
                    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.05)',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    gap: '16px',
                    transition: 'all 0.2s ease',
                    borderTop: `5px solid ${borderClr}`
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-4px)';
                    e.currentTarget.style.boxShadow = '0 12px 28px rgba(0, 35, 111, 0.12)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 4px 20px rgba(0, 0, 0, 0.05)';
                  }}
                >
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {/* Shift & Time Header */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: '11px', fontWeight: 700, color: badgeClr, backgroundColor: bgBadge, padding: '3px 10px', borderRadius: '6px' }}>
                        {shiftLabel}
                      </span>
                      <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-dark)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                        <Clock size={13} style={{ color: 'var(--primary)' }} /> {rt.timeWindow}
                      </span>
                    </div>

                    {/* Route Name Title */}
                    <div>
                      <h3 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-dark)', margin: 0, lineHeight: 1.3 }}>
                        {rt.route_name}
                      </h3>
                      <p style={{ fontSize: '12px', color: '#64748b', margin: '4px 0 0 0', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <MapPin size={13} /> {rt.start_location} → {rt.end_location}
                      </p>
                    </div>

                    {/* Route Details Matrix */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', padding: '12px', backgroundColor: '#f8fafc', borderRadius: '12px', marginTop: '4px' }}>
                      <div>
                        <span style={{ fontSize: '10px', textTransform: 'uppercase', color: '#94a3b8', fontWeight: 700, display: 'block' }}>Assigned Bus</span>
                        <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-dark)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          <Bus size={13} style={{ color: 'var(--primary)' }} /> {rt.bus?.bus_number}
                        </span>
                      </div>
                      <div>
                        <span style={{ fontSize: '10px', textTransform: 'uppercase', color: '#94a3b8', fontWeight: 700, display: 'block' }}>Duration</span>
                        <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-dark)' }}>
                          {rt.estimated_duration} mins
                        </span>
                      </div>
                      <div>
                        <span style={{ fontSize: '10px', textTransform: 'uppercase', color: '#94a3b8', fontWeight: 700, display: 'block' }}>Passengers</span>
                        <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-dark)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          <Users size={13} style={{ color: '#4f46e5' }} /> {rt.total_students} Students
                        </span>
                      </div>
                      <div>
                        <span style={{ fontSize: '10px', textTransform: 'uppercase', color: '#94a3b8', fontWeight: 700, display: 'block' }}>Stops Count</span>
                        <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-dark)' }}>
                          {rt.total_stops} Stops
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Action CTA Button */}
                  <div style={{ paddingTop: '12px', borderTop: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--primary)' }}>
                      Ready to Start
                    </span>
                    <button
                      type="button"
                      style={{
                        padding: '8px 16px',
                        backgroundColor: 'var(--primary)',
                        color: '#ffffff',
                        border: 'none',
                        borderRadius: '8px',
                        fontWeight: 700,
                        fontSize: '12px',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        cursor: 'pointer'
                      }}
                    >
                      <span>View Route Manifest</span>
                      <ChevronRight size={14} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      );
    }

    /* VIEW 2: Selected Route Vertical Manifest Going Downwards */
    return (
      <div className="my-route-page">
        {/* Top Back Navigation Bar & Route Mode Selector */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px', marginBottom: '16px' }}>
          <button
            type="button"
            onClick={() => setSelectedRouteId(null)}
            style={{
              padding: '8px 16px',
              borderRadius: '10px',
              border: '1px solid #cbd5e1',
              backgroundColor: '#ffffff',
              color: 'var(--text-dark)',
              fontWeight: 700,
              fontSize: '13px',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: '0 2px 6px rgba(0, 0, 0, 0.04)'
            }}
          >
            <ArrowLeft size={16} />
            <span>Back to All Routes</span>
          </button>

          {/* Route Mode Switcher (Pick-Up vs Drop-Off) */}
          <div style={{ display: 'inline-flex', backgroundColor: '#f1f5f9', padding: '4px', borderRadius: '10px', border: '1px solid #cbd5e1' }}>
            <button
              type="button"
              onClick={() => setRouteMode('pickup')}
              style={{
                padding: '8px 16px',
                borderRadius: '8px',
                fontSize: '13px',
                fontWeight: 700,
                border: 'none',
                cursor: 'pointer',
                backgroundColor: routeMode === 'pickup' ? '#ffffff' : 'transparent',
                color: routeMode === 'pickup' ? 'var(--primary)' : '#64748b',
                boxShadow: routeMode === 'pickup' ? '0 2px 6px rgba(0, 0, 0, 0.08)' : 'none',
                transition: 'all 0.15s ease',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <span>🌅 Morning Pick-Up Route</span>
            </button>

            <button
              type="button"
              onClick={() => setRouteMode('dropoff')}
              style={{
                padding: '8px 16px',
                borderRadius: '8px',
                fontSize: '13px',
                fontWeight: 700,
                border: 'none',
                cursor: 'pointer',
                backgroundColor: routeMode === 'dropoff' ? '#ffffff' : 'transparent',
                color: routeMode === 'dropoff' ? '#d97706' : '#64748b',
                boxShadow: routeMode === 'dropoff' ? '0 2px 6px rgba(0, 0, 0, 0.08)' : 'none',
                transition: 'all 0.15s ease',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <span>🌆 Afternoon Drop-Off Route (Reversed Order)</span>
            </button>
          </div>
        </div>

        {/* Route Header Banner */}
        <div className="route-header-card">
          <div className="route-header-top">
            <div className="route-title-badge">
              <div className="route-icon-box">
                <Navigation size={26} />
              </div>
              <div>
                <span className="route-subtitle">
                  {routeMode === 'pickup' ? 'Morning Pick-Up Mode' : 'Afternoon Drop-Off Mode (Reversed Path)'}
                </span>
                <h1 className="route-title">{activeRouteData?.route_name}</h1>
              </div>
            </div>
            <div className="header-actions">
              <button
                onClick={() => refetch()}
                className={`refresh-route-btn ${isRefetching ? 'spinning' : ''}`}
                title="Refresh Route Data"
              >
                <RefreshCw size={18} />
                <span>Refresh</span>
              </button>
            </div>
          </div>

          {/* Key Route Metrics */}
          <div className="route-metrics-grid">
            <div className="metric-box">
              <Bus className="metric-icon" size={20} />
              <div>
                <span className="metric-label">Vehicle Assigned</span>
                <span className="metric-value">{activeRouteData?.bus?.bus_number}</span>
                <span className="metric-subtext">{activeRouteData?.bus?.license_plate || 'Active'}</span>
              </div>
            </div>

            <div className="metric-box">
              <MapPin className="metric-icon" size={20} />
              <div>
                <span className="metric-label">Route Range</span>
                <span className="metric-value">
                  {routeMode === 'pickup' 
                    ? `${activeRouteData?.start_location?.split(' ')[0]} → ${activeRouteData?.end_location?.split(' ')[0]}`
                    : `${activeRouteData?.end_location?.split(' ')[0]} → ${activeRouteData?.start_location?.split(' ')[0]}`
                  }
                </span>
                <span className="metric-subtext">{activeRouteData?.distance}</span>
              </div>
            </div>

            <div className="metric-box">
              <Clock className="metric-icon" size={20} />
              <div>
                <span className="metric-label">Est. Duration</span>
                <span className="metric-value">{activeRouteData?.estimated_duration} mins</span>
                <span className="metric-subtext">Shift: {activeRouteData?.timeWindow}</span>
              </div>
            </div>

            <div className="metric-box">
              <Users className="metric-icon" size={20} />
              <div>
                <span className="metric-label">Total Passengers</span>
                <span className="metric-value">{activeRouteData?.total_students} Students</span>
                <span className="metric-subtext">{activeRouteData?.total_stops} Scheduled Stops</span>
              </div>
            </div>
          </div>
        </div>

        {/* Interactive Leaflet Route Map */}
        <div className="route-map-wrapper">
          <RouteMap
            stops={stops}
            selectedStopId={selectedStopId}
            onSelectStop={(stopId) => setSelectedStopId(stopId)}
          />
        </div>

        {/* Vertical List of Stops Going Downwards */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginTop: '8px' }}>
          <h3 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-dark)', margin: '8px 0 0 0' }}>
            Route Sequence ({stops.length} Stops • {routeMode === 'pickup' ? 'Morning Pickup Sequence' : 'Afternoon Reversed Drop-Off Sequence'})
          </h3>

          {stops.map((stop, idx) => {
            const stopKey = stop.stop_id || idx;
            const isCompleted = completedStops[stopKey];
            const isSubmittingThisStop = submittingStopId === stopKey;
            const feedbackText = submitFeedback[stopKey];

            // Determine stop label and action based on routeMode and stop position
            const isFirst = idx === 0;
            const isLast = idx === stops.length - 1;

            let stopTypeLabel = `Stop #${idx}`;
            if (routeMode === 'pickup') {
              if (isFirst) stopTypeLabel = 'Depot Origin (Shift Start)';
              else if (isLast) stopTypeLabel = 'School Destination (Drop-Off)';
              else stopTypeLabel = `Passenger Pick-up #${idx}`;
            } else {
              if (isFirst) stopTypeLabel = 'School Departure (Boarding Origin)';
              else if (isLast) stopTypeLabel = 'Depot Terminal (Final Return)';
              else stopTypeLabel = `Home Drop-Off Node #${idx}`;
            }

            const primaryActionIsDropoff = routeMode === 'dropoff' ? !isFirst : isLast;
            const primaryActionText = primaryActionIsDropoff ? 'Dropped Off' : 'Boarded';

            return (
              <div 
                key={stopKey}
                style={{
                  position: 'relative',
                  backgroundColor: '#ffffff',
                  borderRadius: '16px',
                  padding: '24px',
                  border: isCompleted ? '2px solid #10b981' : '1px solid rgba(197, 197, 211, 0.4)',
                  boxShadow: '0 4px 20px rgba(0, 0, 0, 0.04)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '16px'
                }}
              >
                {/* Vertical Connector Line */}
                {idx < stops.length - 1 && (
                  <div 
                    style={{
                      position: 'absolute',
                      left: '42px',
                      bottom: '-24px',
                      width: '4px',
                      height: '24px',
                      backgroundColor: isCompleted ? '#10b981' : '#cbd5e1',
                      zIndex: 1
                    }}
                  />
                )}

                {/* Stop Header & Badges */}
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                    {/* Circle Order Badge */}
                    <div 
                      style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: '50%',
                        backgroundColor: isCompleted ? '#10b981' : (routeMode === 'dropoff' ? '#d97706' : 'var(--primary)'),
                        color: '#ffffff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 800,
                        fontSize: '14px',
                        flexShrink: 0,
                        boxShadow: isCompleted ? '0 4px 12px rgba(16, 185, 129, 0.3)' : '0 4px 12px rgba(5, 68, 165, 0.2)'
                      }}
                    >
                      {isCompleted ? <Check size={20} /> : <span>{idx + 1}</span>}
                    </div>

                    <div>
                      <span className="stop-type-tag" style={{ margin: 0, marginBottom: '4px', backgroundColor: routeMode === 'dropoff' ? '#fef3c7' : '#eff6ff', color: routeMode === 'dropoff' ? '#b45309' : 'var(--primary)' }}>
                        {stopTypeLabel}
                      </span>
                      <h3 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-dark)', margin: '2px 0 0 0' }}>
                        {stop.stop_address}
                      </h3>
                      <span style={{ fontSize: '12px', color: '#64748b', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                        <Clock size={13} style={{ color: 'var(--primary)' }} /> ETA: {stop.pickup_time}
                      </span>
                    </div>
                  </div>

                  {isCompleted && (
                    <span style={{ fontSize: '12px', fontWeight: 700, color: '#10b981', backgroundColor: '#ecfdf5', padding: '4px 12px', borderRadius: '20px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                      <CheckCircle2 size={14} /> Stop Completed
                    </span>
                  )}
                </div>

                {feedbackText && (
                  <div className="status-alert success" style={{ margin: 0 }}>
                    <ShieldCheck size={18} />
                    <span>{feedbackText}</span>
                  </div>
                )}

                {/* Student Passenger Roster for This Stop */}
                <div className="passenger-roster-section" style={{ marginTop: '8px' }}>
                  <div className="roster-header">
                    <h4 style={{ fontSize: '15px' }}>
                      <Users size={16} /> Passengers at Stop #{idx + 1} ({stop.students?.length || 0})
                    </h4>
                    {stop.students?.length > 0 && (
                      <button onClick={() => handleMarkAllForStop(stop, idx)} className="mark-all-btn">
                        Mark All {primaryActionText}
                      </button>
                    )}
                  </div>

                  {stop.students && stop.students.length > 0 ? (
                    <div className="student-grid">
                      {stop.students.map((student) => {
                        const currentStatus =
                          localAttendance[student.student_id] || student.status || 'Pending';

                        return (
                          <div key={student.student_id} className="student-card">
                            <div className="student-info">
                              <span className="student-avatar">
                                {student.first_name?.[0]}
                                {student.last_name?.[0]}
                              </span>
                              <div>
                                <strong className="student-name">
                                  {student.first_name} {student.last_name}
                                </strong>
                                <span className="student-grade">{student.grade_level}</span>
                              </div>
                            </div>

                            <div className="status-actions">
                              <button
                                type="button"
                                disabled={isUpdatingAttendance}
                                onClick={() =>
                                  handleStatusChange(
                                    student.student_id,
                                    primaryActionText,
                                    activeRouteData.route_id
                                  )
                                }
                                className={`status-btn board-btn ${
                                  currentStatus === 'Boarded' || currentStatus === 'Dropped Off'
                                    ? 'active'
                                    : ''
                                }`}
                              >
                                <CheckCircle2 size={16} />
                                <span>{primaryActionText}</span>
                              </button>

                              <button
                                type="button"
                                disabled={isUpdatingAttendance}
                                onClick={() =>
                                  handleStatusChange(student.student_id, 'Absent', activeRouteData.route_id)
                                }
                                className={`status-btn absent-btn ${
                                  currentStatus === 'Absent' ? 'active' : ''
                                }`}
                              >
                                <XCircle size={16} />
                                <span>Absent</span>
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="empty-roster-msg" style={{ padding: '16px' }}>
                      <p style={{ margin: 0 }}>No passenger pick-ups or drop-offs scheduled at this depot node.</p>
                    </div>
                  )}

                  {/* Complete Check-In Button for This Stop */}
                  <div style={{ marginTop: '16px', textAlign: 'right' }}>
                    <button
                      type="button"
                      onClick={() => handleSingleStopCheckIn(stop, idx)}
                      disabled={isSubmittingThisStop}
                      style={{
                        padding: '10px 20px',
                        backgroundColor: isCompleted ? '#10b981' : (routeMode === 'dropoff' ? '#d97706' : 'var(--primary)'),
                        color: '#ffffff',
                        border: 'none',
                        borderRadius: '10px',
                        fontWeight: 700,
                        fontSize: '13px',
                        cursor: isSubmittingThisStop ? 'not-allowed' : 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '8px',
                        boxShadow: '0 4px 12px rgba(5, 68, 165, 0.2)'
                      }}
                    >
                      {isSubmittingThisStop ? (
                        <>
                          <div className="spinner-small" />
                          <span>Submitting...</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle2 size={16} />
                          <span>{isCompleted ? 'Check-In Complete (Re-sync)' : `Complete Stop #${idx + 1} Check-In`}</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <DashboardLayout onLogout={onLogout}>
      {renderContent()}
    </DashboardLayout>
  );
}
