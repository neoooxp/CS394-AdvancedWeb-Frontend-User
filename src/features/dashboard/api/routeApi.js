import { extractPaginatedData } from '../../../services/apiUtils';

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
 * Fetches the driver's assigned route and corresponding bus directly from the API.
 */
export async function fetchDriverRouteData() {
  const headers = getAuthHeaders();
  const user = getStoredUser();
  const driverId = user?.user_id || null;

  if (!driverId) {
    return {
      assigned: false,
      message: 'No logged in user session found',
      stops: [],
    };
  }

  let allRoutes = [];
  let allBuses = [];
  let driverSchedules = [];
  let assignedRoute = null;
  let manifestStops = [];

  // 1. Fetch routes assigned to this driver from API
  try {
    const routesRes = await fetch(`${API_BASE_URL}/routes?driver_id=${driverId}&per_page=50`, { headers });
    if (routesRes.status === 401) {
      localStorage.removeItem('sbms_auth_token');
      localStorage.removeItem('sbms_user');
      sessionStorage.removeItem('sbms_auth_token');
      sessionStorage.removeItem('sbms_user');
      window.location.reload();
      return;
    }
    if (routesRes.ok) {
      allRoutes = await extractPaginatedData(routesRes);
    }
  } catch (err) {
    console.warn('API GET /routes fetch error:', err);
  }

  // 2. Fetch driver schedules/bus assignments from API
  try {
    const schedRes = await fetch(`${API_BASE_URL}/driver/schedule?driver_id=${driverId}`, { headers });
    if (schedRes.status === 401) {
      localStorage.removeItem('sbms_auth_token');
      localStorage.removeItem('sbms_user');
      sessionStorage.removeItem('sbms_auth_token');
      sessionStorage.removeItem('sbms_user');
      window.location.reload();
      return;
    }
    if (schedRes.ok) {
      driverSchedules = await extractPaginatedData(schedRes);
    }
  } catch (err) {
    console.warn('API GET /driver/schedule fetch error:', err);
  }

  // 3. Fetch buses from API (single page)
  try {
    const busesRes = await fetch(`${API_BASE_URL}/buses?per_page=100`, { headers });
    if (busesRes.ok) {
      allBuses = await extractPaginatedData(busesRes);
    }
  } catch (err) {
    console.warn('API GET /buses fetch error:', err);
  }

  // Determine all assigned routes for this driver
  let assignedRoutes = [];
  if (Array.isArray(allRoutes) && allRoutes.length > 0) {
    const driverFullName = user ? `${user.first_name || ''} ${user.last_name || ''}`.trim().toLowerCase() : '';

    assignedRoutes = allRoutes.filter((r) => {
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

    if (assignedRoutes.length === 0 && driverSchedules.length > 0 && driverSchedules[0]?.bus_id) {
      const assignedBusId = driverSchedules[0]?.bus_id;
      assignedRoutes = allRoutes.filter((r) => r.buses?.some((b) => Number(b.bus_id) === Number(assignedBusId)));
    }
  }

  if (assignedRoutes.length === 0 && allRoutes.length > 0) {
    assignedRoutes = [allRoutes[0]];
  }

  if (assignedRoutes.length === 0) {
    return {
      assigned: false,
      message: `No route currently assigned to driver ID #${driverId}`,
      driver: {
        user_id: driverId,
        name: user ? `${user.first_name || ''} ${user.last_name || ''}`.trim() : `Driver #${driverId}`,
      },
      stops: [],
      total_stops: 0,
      total_students: 0,
    };
  }

  // Format all assigned routes
  const formattedAssignedRoutes = assignedRoutes.map((targetRoute) => {
    let correspondingBus = null;
    if (Array.isArray(targetRoute.buses) && targetRoute.buses.length > 0) {
      correspondingBus = targetRoute.buses[0];
    } else if (Array.isArray(allBuses) && allBuses.length > 0) {
      correspondingBus = allBuses.find((b) => b.bus_id === targetRoute.bus_id) || allBuses[0];
    }

    const busInfo = {
      bus_id: correspondingBus?.bus_id || null,
      bus_number: correspondingBus?.bus_number || 'Unassigned Bus',
      capacity: correspondingBus?.capacity || 0,
      license_plate: correspondingBus?.license_plate || 'N/A',
      status: correspondingBus?.status || 'Active',
    };

    let intermediateStops = [];
    if (Array.isArray(targetRoute?.stops) && targetRoute.stops.length > 0) {
      const stopsMap = new Map();
      targetRoute.stops.forEach((s, idx) => {
        const addr = s.stop_address || `Stop #${idx + 1}`;
        if (!stopsMap.has(addr)) {
          stopsMap.set(addr, {
            stop_id: s.student_stop_id || idx + 10,
            stop_order: s.stop_order || idx + 2,
            stop_address: addr,
            pickup_time: `Scheduled`,
            type: 'pickup',
            students: [],
          });
        }
        const stObj = s.student || (targetRoute.students ? targetRoute.students.find(st => Number(st.student_id) === Number(s.student_id)) : null);
        if (stObj) {
          stopsMap.get(addr).students.push({
            student_id: stObj.student_id,
            first_name: stObj.first_name,
            last_name: stObj.last_name,
            grade_level: stObj.grade_level || 'Student',
            status: 'Pending',
          });
        }
      });
      intermediateStops = Array.from(stopsMap.values());
    } else if (targetRoute?.students?.length) {
      const stopsMap = new Map();
      targetRoute.students.forEach((st, idx) => {
        const addr = st.pivot?.stop_address || `Stop #${idx + 1}`;
        if (!stopsMap.has(addr)) {
          stopsMap.set(addr, {
            stop_id: idx + 10,
            stop_order: stopsMap.size + 2,
            stop_address: addr,
            pickup_time: 'Scheduled',
            type: 'pickup',
            students: [],
          });
        }
        stopsMap.get(addr).students.push({
          student_id: st.student_id,
          first_name: st.first_name,
          last_name: st.last_name,
          grade_level: st.grade_level || 'Student',
          status: 'Pending',
        });
      });
      intermediateStops = Array.from(stopsMap.values());
    }

    const startName = targetRoute?.start_location || 'Start Depot Terminal';
    const endName = targetRoute?.end_location || 'School Destination';

    const startStop = {
      stop_id: 1,
      stop_order: 1,
      stop_address: startName,
      pickup_time: 'Start Shift',
      type: 'depot',
      students: [],
    };

    const endStop = {
      stop_id: 999,
      stop_order: intermediateStops.length + 2,
      stop_address: endName,
      pickup_time: 'Arrival Destination',
      type: 'dropoff',
      students: [],
    };

    const formattedStops = [startStop, ...intermediateStops, endStop];
    const totalStudents = intermediateStops.reduce((acc, stop) => acc + stop.students.length, 0);

    const savedTimeWindow = localStorage.getItem(`sbms_route_timewindow_${targetRoute.route_id}`) || localStorage.getItem(`sbms_route_timewindow_route-${targetRoute.route_id}`);
    const defaultWindow = Number(targetRoute.route_id) === 11 ? '11:30 AM - 01:00 PM' : '07:00 AM - 08:30 AM';
    const timeWindow = savedTimeWindow || defaultWindow;

    return {
      assigned: true,
      route_id: targetRoute.route_id,
      route_name: targetRoute.route_name,
      timeWindow: timeWindow,
      start_location: startName,
      end_location: endName,
      estimated_duration: targetRoute.estimated_duration,
      distance: `${targetRoute.estimated_duration ? (targetRoute.estimated_duration * 0.3).toFixed(1) : '10'} miles`,
      bus: busInfo,
      driver: {
        user_id: driverId,
        name: user ? `${user.first_name || ''} ${user.last_name || ''}`.trim() : `Driver #${driverId}`,
      },
      total_stops: formattedStops.length,
      total_students: totalStudents,
      stops: formattedStops,
    };
  });

  return {
    ...formattedAssignedRoutes[0],
    assignedRoutes: formattedAssignedRoutes,
  };
}

/**
 * Records attendance for a student at a stop directly to backend API.
 */
export async function updateStudentAttendance({ studentId, status, routeId }) {
  const headers = getAuthHeaders();
  const user = getStoredUser();
  const today = new Date().toISOString().split('T')[0];

  const payload = {
    student_id: studentId,
    date: today,
    status: status,
    recorded_by: user?.user_id || 1,
  };

  const response = await fetch(`${API_BASE_URL}/operations/attendance`, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.message || 'Failed to update attendance status');
  }

  return await response.json();
}

/**
 * Bulk record attendance for multiple students in one API call.
 */
export async function updateBulkAttendance({ attendances }) {
  const headers = getAuthHeaders();
  const user = getStoredUser();
  const today = new Date().toISOString().split('T')[0];

  const payload = {
    attendances: attendances.map((a) => ({
      student_id: a.studentId,
      date: today,
      status: a.status,
      recorded_by: user?.user_id || 1,
    })),
  };

  const response = await fetch(`${API_BASE_URL}/operations/attendance/bulk`, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.message || 'Failed to update attendance');
  }

  return await response.json();
}

/**
 * Generates a final attendance report for a route on the backend.
 * Called when the driver clicks "Route Completed".
 */
export async function generateRouteReport(routeId) {
  const headers = getAuthHeaders();

  const response = await fetch(`${API_BASE_URL}/operations/routes/${routeId}/reports`, {
    method: 'POST',
    headers,
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.message || 'Failed to generate route report');
  }

  return await response.json();
}

/**
 * Fetches the driver's weekly schedule matrix directly from backend API.
 */
export async function fetchDriverWeeklyScheduleData() {
  const headers = getAuthHeaders();
  const user = getStoredUser();
  const driverId = user?.user_id || null;

  let schedules = [];
  let routes = [];
  let buses = [];
  let maintenanceRequests = [];

  try {
    const [schedRes, routesRes, busesRes, maintRes] = await Promise.all([
      fetch(`${API_BASE_URL}/driver/schedule?driver_id=${driverId}`, { headers }),
      fetch(`${API_BASE_URL}/routes?driver_id=${driverId}&per_page=50`, { headers }),
      fetch(`${API_BASE_URL}/buses?per_page=100`, { headers }),
      fetch(`${API_BASE_URL}/maintenance/requests?per_page=25`, { headers }).catch(() => null)
    ]);

    if (schedRes && schedRes.ok) schedules = await extractPaginatedData(schedRes);
    if (routesRes && routesRes.ok) routes = await extractPaginatedData(routesRes);
    if (busesRes && busesRes.ok) buses = await extractPaginatedData(busesRes);
    if (maintRes && maintRes.ok) maintenanceRequests = await extractPaginatedData(maintRes);
  } catch (err) {
    console.warn('Error fetching weekly schedule API data:', err);
  }

  // Find all routes assigned to this driver
  const assignedRoutes = (Array.isArray(routes) ? routes : []).filter(r => 
    r && (
      (r.driver_id != null && Number(r.driver_id) === Number(driverId)) ||
      (r.driver?.user_id != null && Number(r.driver.user_id) === Number(driverId)) ||
      (r.driver?.id != null && Number(r.driver.id) === Number(driverId))
    )
  );

  const finalAssignedRoutes = assignedRoutes.length > 0 ? assignedRoutes : (routes.length > 0 ? [routes[0]] : []);

  const formattedRoutes = finalAssignedRoutes.map(r => {
    let busObj = null;
    if (r.buses && r.buses.length > 0) {
      busObj = r.buses[0];
    } else if (Array.isArray(buses) && buses.length > 0) {
      busObj = buses[0];
    }

    const savedTimeWindow = localStorage.getItem(`sbms_route_timewindow_${r.route_id}`) || localStorage.getItem(`sbms_route_timewindow_route-${r.route_id}`);
    const defaultWindow = Number(r.route_id) === 11 ? '11:30 AM - 01:00 PM' : '07:00 AM - 08:30 AM';
    const timeWindow = savedTimeWindow || defaultWindow;

    return {
      route_id: r.route_id,
      route_name: r.route_name,
      timeWindow: timeWindow,
      busBadgeStr: busObj ? `Bus #${busObj.bus_number || busObj.bus_id} (Standard)` : 'Bus #402 (Standard)',
      bus_id: busObj?.bus_id || null,
    };
  });

  return {
    driver: {
      user_id: driverId,
      name: user ? `${user.first_name || ''} ${user.last_name || ''}`.trim() : 'Driver',
    },
    assignedRoutes: formattedRoutes,
    assignedRoute: finalAssignedRoutes[0] || null,
    rawSchedules: schedules,
  };
}
