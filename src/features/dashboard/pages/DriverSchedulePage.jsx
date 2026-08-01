import React, { useState, useMemo } from 'react';
import { 
  Calendar as CalendarIcon, 
  Bus, 
  Clock, 
  Star, 
  Armchair
} from 'lucide-react';
import { DashboardLayout } from '../../../components/layout/DashboardLayout';
import { useDriverSchedule } from '../hooks/useDriverSchedule';

export function DriverSchedulePage({ onLogout }) {
  const { data, isLoading, error } = useDriverSchedule();
  const [viewMode, setViewMode] = useState('week'); // 'week' | 'month'

  const assignedRoutes = useMemo(() => {
    if (data?.assignedRoutes && data.assignedRoutes.length > 0) {
      return data.assignedRoutes;
    }
    if (data?.assignedRoute) {
      return [{
        route_id: data.assignedRoute.route_id,
        route_name: data.assignedRoute.route_name || 'Route A1 - Norodom Blvd Express',
        timeWindow: '07:00 AM - 08:30 AM',
        busBadgeStr: data.busBadgeStr || 'Bus #402 (Standard)'
      }];
    }
    return [{
      route_id: 1,
      route_name: 'Route A1 - Norodom Blvd Express',
      timeWindow: '07:00 AM - 08:30 AM',
      busBadgeStr: 'Bus #402 (Standard)'
    }];
  }, [data]);

  // Calculate current week dates dynamically
  const weeklyDays = useMemo(() => {
    const today = new Date();
    const currentDayOfWeek = today.getDay(); // 0 is Sun, 1 is Mon...
    const distanceToMon = (currentDayOfWeek + 6) % 7;
    const monday = new Date(today);
    monday.setDate(today.getDate() - distanceToMon);

    const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    return dayNames.map((name, index) => {
      const d = new Date(monday);
      d.setDate(monday.getDate() + index);

      const dateNum = d.getDate();
      const monthStr = monthNames[d.getMonth()];
      const isToday = d.toDateString() === today.toDateString();

      return {
        dayName: name,
        dateNum,
        monthStr,
        fullDateStr: `${monthStr} ${dateNum}`,
        isToday,
        isWeekend: index >= 5, // Saturday / Sunday
      };
    });
  }, []);

  const weekDateRangeStr = `${weeklyDays[0].monthStr} ${weeklyDays[0].dateNum} - ${weeklyDays[6].monthStr} ${weeklyDays[6].dateNum}, ${new Date().getFullYear()}`;

  return (
    <DashboardLayout onLogout={onLogout} driverInfo={data?.driver}>
      {isLoading ? (
        <div className="dashboard-loading-state">
          <div className="spinner-large" />
          <p>Loading weekly shift schedule...</p>
        </div>
      ) : error ? (
        <div className="status-alert error">
          Failed to load schedule data from server. Please refresh or try again.
        </div>
      ) : (
        <div className="dashboard-content-flow">
          {/* Header Bar */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px', marginBottom: '8px' }}>
            <div style={{ textAlign: 'left' }}>
              <h2 style={{ fontSize: '26px', fontWeight: 800, color: 'var(--text-dark)', margin: 0 }}>
                Weekly Schedule
              </h2>
              <p style={{ fontSize: '13px', color: 'var(--icon-color)', margin: '4px 0 0 0' }}>
                {weekDateRangeStr} • <strong>{assignedRoutes.length} Active Route Shifts Assigned</strong>
              </p>
            </div>

            {/* View Mode Toggle Switch */}
            <div style={{ display: 'inline-flex', backgroundColor: '#f1f5f9', padding: '4px', borderRadius: '10px', border: '1px solid #cbd5e1' }}>
              <button
                type="button"
                onClick={() => setViewMode('week')}
                style={{
                  padding: '6px 16px',
                  borderRadius: '8px',
                  fontSize: '13px',
                  fontWeight: 700,
                  border: 'none',
                  cursor: 'pointer',
                  backgroundColor: viewMode === 'week' ? '#ffffff' : 'transparent',
                  color: viewMode === 'week' ? 'var(--primary-brand)' : '#64748b',
                  boxShadow: viewMode === 'week' ? '0 2px 6px rgba(0, 0, 0, 0.08)' : 'none',
                  transition: 'all 0.15s ease'
                }}
              >
                Week View
              </button>
              <button
                type="button"
                onClick={() => setViewMode('month')}
                style={{
                  padding: '6px 16px',
                  borderRadius: '8px',
                  fontSize: '13px',
                  fontWeight: 700,
                  border: 'none',
                  cursor: 'pointer',
                  backgroundColor: viewMode === 'month' ? '#ffffff' : 'transparent',
                  color: viewMode === 'month' ? 'var(--primary-brand)' : '#64748b',
                  boxShadow: viewMode === 'month' ? '0 2px 6px rgba(0, 0, 0, 0.08)' : 'none',
                  transition: 'all 0.15s ease'
                }}
              >
                Month View
              </button>
            </div>
          </div>

          {viewMode === 'month' ? (
            <div style={{ padding: '32px', backgroundColor: '#ffffff', borderRadius: '16px', border: '1px solid rgba(197, 197, 211, 0.3)', textAlign: 'center', margin: '16px 0' }}>
              <CalendarIcon size={36} style={{ color: 'var(--primary-brand)', marginBottom: '12px' }} />
              <h3 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-dark)', margin: 0 }}>Month View Calendar</h3>
              <p style={{ fontSize: '13px', color: '#64748b', marginTop: '6px' }}>Showing full month shift deployment matrix for {weeklyDays[0].monthStr} {new Date().getFullYear()}.</p>
              <button type="button" onClick={() => setViewMode('week')} style={{ marginTop: '12px', padding: '8px 16px', backgroundColor: 'var(--primary-brand)', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' }}>
                Switch to Week Grid View
              </button>
            </div>
          ) : (
            /* Weekly 7-Day Grid Layout */
            <div 
              style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', 
                gap: '16px', 
                marginTop: '16px',
                textAlign: 'left'
              }}
            >
              {weeklyDays.map((day) => {
                if (day.isWeekend) {
                  return (
                    <div 
                      key={day.dayName}
                      style={{
                        backgroundColor: 'rgba(241, 245, 249, 0.6)',
                        borderRadius: '16px',
                        padding: '24px 16px',
                        border: '1px dashed #cbd5e1',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        textAlign: 'center',
                        gap: '12px'
                      }}
                    >
                      <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: '#e2e8f0', color: '#64748b', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Armchair size={20} />
                      </div>
                      <div>
                        <span style={{ fontSize: '10px', textTransform: 'uppercase', color: '#94a3b8', fontWeight: 700 }}>{day.monthStr} {day.dateNum}</span>
                        <h4 style={{ fontSize: '15px', fontWeight: 800, color: 'var(--text-dark)', margin: '2px 0 0 0' }}>{day.dayName}</h4>
                        <p style={{ fontSize: '12px', color: '#94a3b8', margin: '4px 0 0 0' }}>No Scheduled Routes</p>
                      </div>
                    </div>
                  );
                }

                return (
                  <div 
                    key={day.dayName}
                    style={{
                      backgroundColor: '#ffffff',
                      borderRadius: '16px',
                      padding: '16px',
                      border: day.isToday ? '2px solid var(--primary-brand)' : '1px solid rgba(197, 197, 211, 0.4)',
                      boxShadow: '0 4px 16px rgba(0, 0, 0, 0.04)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '12px'
                    }}
                  >
                    {/* Day Header */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{ width: '38px', height: '38px', borderRadius: '50%', backgroundColor: day.isToday ? 'var(--primary-brand)' : '#f1f5f9', color: day.isToday ? '#ffffff' : '#475569', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '12px', lineHeight: 1 }}>
                          <span style={{ fontSize: '9px', opacity: 0.8, textTransform: 'uppercase' }}>{day.monthStr}</span>
                          <span>{day.dateNum}</span>
                        </div>
                        <div>
                          <h4 style={{ fontSize: '15px', fontWeight: 800, color: 'var(--text-dark)', margin: 0 }}>{day.dayName}</h4>
                          {day.isToday && <span style={{ fontSize: '11px', color: 'var(--icon-color)' }}>Current Day</span>}
                        </div>
                      </div>
                      {day.isToday && (
                        <span style={{ width: '22px', height: '22px', borderRadius: '50%', backgroundColor: 'var(--primary-brand)', color: '#ffffff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                          <Star size={12} fill="#ffffff" />
                        </span>
                      )}
                    </div>                    {/* Render All Assigned Routes for Driver */}
                    {assignedRoutes.map((rt, rIdx) => {
                      const isAfternoon = rt.timeWindow.includes('02:') || rt.timeWindow.includes('03:') || rt.timeWindow.includes('04:') || rt.timeWindow.includes('05:');
                      const isMidDay = rt.timeWindow.includes('11:') || rt.timeWindow.includes('12:') || rt.timeWindow.includes('01:');
                      
                      let borderClr = '#6366f1';
                      let badgeClr = '#4f46e5';
                      let bgBadge = '#e0e7ff';
                      let labelText = 'Morning Shift';

                      if (isAfternoon) {
                        borderClr = '#d97706';
                        badgeClr = '#92400e';
                        bgBadge = '#fef3c7';
                        labelText = 'Afternoon Shift';
                      } else if (isMidDay) {
                        borderClr = '#f59e0b';
                        badgeClr = '#b45309';
                        bgBadge = '#fef3c7';
                        labelText = 'Mid-Day Shift';
                      }

                      return (
                        <div key={`${rt.route_id}_${rIdx}`} style={{ backgroundColor: '#f8fafc', borderRadius: '12px', padding: '10px 12px', borderLeft: `4px solid ${borderClr}`, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
                            <span style={{ fontSize: '10px', fontWeight: 700, color: badgeClr, backgroundColor: bgBadge, padding: '2px 6px', borderRadius: '4px', whiteSpace: 'nowrap' }}>
                              {labelText}
                            </span>
                            <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-dark)', whiteSpace: 'nowrap' }}>{rt.timeWindow}</span>
                          </div>
                          <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-dark)', lineHeight: 1.2 }}>{rt.route_name}</span>
                          <span style={{ fontSize: '11px', color: 'var(--icon-color)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                            <Bus size={12} /> {rt.busBadgeStr}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </DashboardLayout>
  );
}
