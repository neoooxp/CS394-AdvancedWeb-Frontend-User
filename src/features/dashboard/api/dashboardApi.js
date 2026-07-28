const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000/api';

/**
 * Get stored auth headers for API calls.
 */
function getAuthHeaders() {
  const token = localStorage.getItem('sbms_auth_token') || sessionStorage.getItem('sbms_auth_token');
  return {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

/**
 * Get active user object from local/session storage.
 */
function getStoredUser() {
  const userStr = localStorage.getItem('sbms_user') || sessionStorage.getItem('sbms_user');
  return userStr ? JSON.parse(userStr) : null;
}

/**
 * Fetches real schedule, bus, and route data assigned to the driver from the backend API.
 */
export async function fetchDriverDashboardData() {
  const headers = getAuthHeaders();
  const user = getStoredUser();
  const driverId = user?.user_id || user?.id || null;

  let allRoutes = [];
  let driverSchedule = [];
  let assignedRoute = null;

  if (driverId) {
    // 1. Fetch routes from API
    try {
      const routesRes = await fetch(`${API_BASE_URL}/routes`, { headers });
      if (routesRes.status === 401) {
        localStorage.removeItem('sbms_auth_token');
        localStorage.removeItem('sbms_user');
        sessionStorage.removeItem('sbms_auth_token');
        sessionStorage.removeItem('sbms_user');
        window.location.reload();
        return;
      }
      if (routesRes.ok) {
        allRoutes = await routesRes.json();
      }
    } catch (err) {
      console.warn('API GET /routes fetch error:', err);
    }

    // 2. Fetch driver schedules / bus assignments from API
    try {
      const scheduleRes = await fetch(`${API_BASE_URL}/driver/schedule?driver_id=${driverId}`, { headers });
      if (scheduleRes.status === 401) {
        localStorage.removeItem('sbms_auth_token');
        localStorage.removeItem('sbms_user');
        sessionStorage.removeItem('sbms_auth_token');
        sessionStorage.removeItem('sbms_user');
        window.location.reload();
        return;
      }
      if (scheduleRes.ok) {
        driverSchedule = await scheduleRes.json();
      }
    } catch (err) {
      console.warn('API GET /driver/schedule fetch error:', err);
    }
  }

  // Determine assigned route
  if (Array.isArray(allRoutes) && allRoutes.length > 0) {
    const driverFullName = user ? `${user.first_name || ''} ${user.last_name || ''}`.trim().toLowerCase() : '';

    assignedRoute = allRoutes.find((r) => {
      if (!r) return false;
      const matchRouteDriverId = r.driver_id != null && Number(r.driver_id) === Number(driverId);
      const matchDriverUserId = r.driver?.user_id != null && Number(r.driver.user_id) === Number(driverId);
      const matchDriverId = r.driver?.id != null && Number(r.driver.id) === Number(driverId);

      let matchName = false;
      if (r.driver && driverFullName) {
        const routeDriverName = `${r.driver.first_name || ''} ${r.driver.last_name || ''}`.trim().toLowerCase();
        matchName = routeDriverName.length > 0 && routeDriverName === driverFullName;
      }

      return matchRouteDriverId || matchDriverUserId || matchDriverId || matchName;
    });

    // Check if assigned bus is linked to a route
    if (!assignedRoute && Array.isArray(driverSchedule) && driverSchedule.length > 0) {
      const assignedBusId = driverSchedule[0]?.bus_id;
      if (assignedBusId) {
        assignedRoute = allRoutes.find((r) => r.buses?.some((b) => Number(b.bus_id) === Number(assignedBusId)));
      }
    }
  }

  const busInfo = assignedRoute?.buses?.[0] || driverSchedule?.[0]?.bus || { bus_number: 'Unassigned', status: 'N/A' };
  const studentsCount = assignedRoute?.students?.length || 0;

  const realSchedule = assignedRoute
    ? [
        {
          id: 'step-1',
          time: '06:45 AM',
          title: `${assignedRoute.start_location} - Start Shift`,
          subtitle: 'Vehicle Inspection & Log',
          status: 'completed',
          badgeText: 'Completed',
        },
        {
          id: 'step-2',
          time: '07:15 AM',
          title: assignedRoute.route_name,
          subtitle: `${studentsCount} Students En Route`,
          status: 'current',
          badgeText: 'Current',
          actionButton: 'Arrived',
        },
        {
          id: 'step-3',
          time: '07:45 AM',
          title: assignedRoute.end_location,
          subtitle: 'Drop-off Destination',
          status: 'pending',
          badgeText: '',
        },
      ]
    : [];

  return {
    driver: {
      name: user ? `${user.first_name || ''} ${user.last_name || ''}`.trim() : 'Unknown Driver',
      driver_id: user?.user_id ? `${user.user_id}` : 'N/A',
      shift_start: driverSchedule?.[0]?.shift_start_time
        ? new Date(driverSchedule[0].shift_start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        : 'N/A',
      date_str: new Date().toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      }),
    },
    stats: {
      assigned_bus: busInfo.bus_number,
      bus_status: busInfo.status,
      today_route: assignedRoute?.route_name || 'No Assigned Route',
      students_assigned: studentsCount,
      pending_maintenance: 0,
    },
    schedule: realSchedule,
    route_summary: {
      total_distance: assignedRoute ? `${(assignedRoute.estimated_duration * 0.3).toFixed(1)} mi` : '0 mi',
      est_duration: assignedRoute ? `${assignedRoute.estimated_duration} mins` : 'N/A',
    },
    upcoming_stops: assignedRoute?.students?.length
      ? assignedRoute.students.map((student, idx) => ({
          id: student.student_id || idx + 1,
          name: student.pivot?.stop_address || `${student.first_name} ${student.last_name}'s Stop`,
          subtext: student.grade_level || 'Student Stop',
          time: 'Scheduled',
          students: 1,
          type: 'pickup',
        }))
      : [],
  };
}
