# 1M Rows Readiness: Implementation Plan

## Priority Order (Highest Impact First)

---

### Fix 1: Eliminate `fetchAllPages` — Server-Side Pagination

**Impact:** Critical. Currently fetches ALL rows into client memory. At 1M rows, browser tab crashes.

**Files to change:**

#### 1a) Replace `fetchAllPages` utility
`src/services/apiUtils.js` — Replace recursive fetch with a single-page fetcher:

```js
// BEFORE (del):
export async function fetchAllPages(url, headers, page = 1, accumulated = []) {
  const separator = url.includes('?') ? '&' : '?';
  const response = await fetch(`${url}${separator}page=${page}`, { headers });
  const json = await response.json();
  const data = (json && typeof json === 'object' && 'data' in json) ? json.data : json;
  const currentPage = json.current_page || json.meta?.current_page || page;
  const lastPage = json.last_page || json.meta?.last_page || 1;
  const results = [...accumulated, ...(Array.isArray(data) ? data : [])];
  if (currentPage < lastPage) return fetchAllPages(url, headers, page + 1, results);
  return results;
}

// AFTER (add):
export async function fetchPaginated(url, { page = 1, perPage = 25, headers = {} } = {}) {
  const separator = url.includes('?') ? '&' : '?';
  const response = await fetch(`${url}${separator}page=${page}&per_page=${perPage}`, { headers });
  if (!response.ok) throw new Error(`API error: ${response.status}`);
  const json = await response.json();
  return {
    data: json.data || [],
    currentPage: json.current_page || 1,
    lastPage: json.last_page || 1,
    total: json.total || 0,
    perPage: json.per_page || perPage,
  };
}
```

#### 1b) Update `routeApi.js` — `fetchDriverRouteData`
Replace `fetchAllPages` on /routes and /buses with single-page fetch. For a driver's assigned route, use a targeted query instead of filtering all routes client-side.

```diff
- allRoutes = await fetchAllPages(`${API_BASE_URL}/routes`, headers);
+ const result = await fetchPaginated(`${API_BASE_URL}/routes`, { 
+   headers, 
+   page: 1, 
+   perPage: 100  // keep small; drivers have few routes
+ });
+ allRoutes = result.data;
```

Also add `?driver_id=` query param so the backend returns only assigned routes:
```diff
- const routesRes = await fetch(`${API_BASE_URL}/routes`, { headers });
+ const routesRes = await fetch(`${API_BASE_URL}/routes?driver_id=${driverId}`, { headers });
```

#### 1c) Update `dashboardApi.js` — `fetchDriverDashboardData`
Same pattern: add `?driver_id=` to /routes call, remove `fetchAllPages`.

#### 1d) Update `routeApi.js` — `fetchDriverWeeklyScheduleData`
Replace `fetchAllPages` on /routes, /buses, /maintenance/requests with `fetchPaginated` single-page.

#### 1e) Update `maintenanceApi.js` — `fetchMaintenanceRequests`
Use `fetchPaginated` with a small `perPage`.

---

### Fix 2: Bulk Attendance API

**Impact:** Critical. Row-by-row POSTs to attendance. A route with 60 students = 60 sequential requests.

**Files to change:**

#### 2a) `src/features/dashboard/api/routeApi.js` — Add bulk function:

```js
export async function updateBulkAttendance({ attendances }) {
  const headers = getAuthHeaders();
  const response = await fetch(`${API_BASE_URL}/operations/attendance/bulk`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ attendances }),
  });
  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.message || 'Failed to update attendance');
  }
  return await response.json();
}
```

#### 2b) `src/features/dashboard/hooks/useDriverRoute.js` — Add bulk mutation:

```js
const bulkAttendanceMutation = useMutation({
  mutationFn: updateBulkAttendance,
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['driverRoute'] });
    queryClient.invalidateQueries({ queryKey: ['driver-dashboard'] });
  },
});
```

#### 2c) `src/features/dashboard/pages/MyRoutePage.jsx` — Use bulk at `handleSingleStopCheckIn`:

Replace the per-student loop with a single `markBulkAttendance` call collecting all students' `{ student_id, status }` into one array.

---

### Fix 3: Code Splitting + Vendor Chunking

**Impact:** High. Single 569 KB JS bundle. Users wait for Leaflet + TanStack Query before any page renders.

**Files to change:**

#### 3a) `vite.config.js`:

```js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
          query: ['@tanstack/react-query'],
          leaflet: ['leaflet'],
        },
      },
    },
  },
})
```

#### 3b) `src/App.jsx` — Route-level lazy loading:

```js
import { lazy, Suspense } from 'react';

const DriverDashboardPage = lazy(() => import('./features/dashboard/pages/DriverDashboardPage'));
const MyRoutePage = lazy(() => import('./features/dashboard/pages/MyRoutePage'));
const DriverSchedulePage = lazy(() => import('./features/dashboard/pages/DriverSchedulePage'));
const MaintenancePage = lazy(() => import('./features/maintenance/components/MaintenancePage'));
const LoginForm = lazy(() => import('./features/auth/components/LoginForm'));

// Wrap Routes in <Suspense fallback={<div className="spinner-large" />}>
```

---

### Fix 4: Set Proper `staleTime` on TanStack Query Hooks

**Impact:** High. `staleTime: 0` means every navigation triggers full refetch. No caching benefit at all.

**Files to change:**

#### 4a) `src/features/dashboard/hooks/useDriverRoute.js:10`:

```diff
- staleTime: 0,
+ staleTime: 1000 * 30, // 30s — route data doesn't change mid-shift
```

#### 4b) `src/features/dashboard/hooks/useDriverDashboard.js:11`:

```diff
- staleTime: 0,
+ staleTime: 1000 * 30,
```

#### 4c) `src/features/dashboard/hooks/useDriverSchedule.js:8`:

```diff
- staleTime: 0,
+ staleTime: 1000 * 60, // 1min — schedules change less frequently
```

---

### Fix 5: Virtualize the Stop List

**Impact:** Medium-High. Current `stops.map()` renders all stops as full DOM. Not a problem for 10-stop routes, but the pattern is unbounded and will freeze at 1000+.

**Files to change:**

#### 5a) Install:

```bash
npm install @tanstack/react-virtual
```

#### 5b) `src/features/dashboard/pages/MyRoutePage.jsx`:

Replace `stops.map()` block with virtualized list:

```js
import { useVirtualizer } from '@tanstack/react-virtual';

// Inside component:
const parentRef = useRef(null);
const rowVirtualizer = useVirtualizer({
  count: stops.length,
  getScrollElement: () => parentRef.current,
  estimateSize: () => 300, // estimated stop card height
});

// Replace stops.map() with:
<div ref={parentRef} style={{ height: '600px', overflow: 'auto' }}>
  <div style={{ height: `${rowVirtualizer.getTotalSize()}px`, position: 'relative' }}>
    {rowVirtualizer.getVirtualItems().map((virtualRow) => {
      const stop = stops[virtualRow.index];
      const idx = virtualRow.index;
      return (
        <div key={stop.stop_id || idx}
          style={{ position: 'absolute', top: 0, left: 0, width: '100%', transform: `translateY(${virtualRow.start}px)` }}>
          {/* existing stop card JSX (lines 629-826) */}
        </div>
      );
    })}
  </div>
</div>
```

---

## Execution Order

| Step | Description | Est. Time | Depends On |
|------|-------------|-----------|------------|
| 1 | Replace `fetchAllPages` with `fetchPaginated` in `apiUtils.js` | 15 min | — |
| 2 | Update `routeApi.js` to use `fetchPaginated` + `?driver_id=` query | 30 min | Step 1 |
| 3 | Update `dashboardApi.js` to use `fetchPaginated` + `?driver_id=` | 15 min | Step 1 |
| 4 | Update `maintenanceApi.js` fetch + add paginated listing UI | 45 min | Step 1 |
| 5 | Add bulk attendance function to `routeApi.js` | 10 min | — |
| 6 | Add bulk mutation hook to `useDriverRoute.js` | 5 min | Step 5 |
| 7 | Replace per-student loop with bulk call in `MyRoutePage.jsx` | 20 min | Step 6 |
| 8 | Add `manualChunks` to `vite.config.js` | 2 min | — |
| 9 | Convert route imports to `React.lazy()` in `App.jsx` | 15 min | Step 8 |
| 10 | Set `staleTime > 0` on all query hooks | 5 min | — |
| 11 | Install `@tanstack/react-virtual` | 2 min | — |
| 12 | Virtualize stop list in `MyRoutePage.jsx` | 45 min | Step 11 |
| 13 | Run build, verify chunk sizes and no errors | 10 min | Steps 1-12 |
| **Total** | | **~3.5h** | |

---

## Backend Work Required (Outside This Repo)

These changes require backend (Laravel) modifications:

1. **Bulk attendance endpoint:** `POST /api/operations/attendance/bulk` — accepts `{ attendances: [{ student_id, status, date, recorded_by }] }` array
2. **Driver_id query filter on /routes:** `GET /api/routes?driver_id=X` — returns only routes assigned to that driver
3. **Paginated maintenance requests with search:** `GET /api/maintenance/requests?page=1&perPage=25&search=brakes`
4. **Indexes:** `CREATE INDEX idx_attendance_student_date ON attendance_records(student_id, date)`
