# 1 Million Rows Readiness Report
**Project:** SBMS Driver Portal (user-frontend)
**Date:** July 30, 2026
**Overall Score:** 6/30 PASS | 5 WARN | 19 FAIL

---

## Summary Verdict

This frontend-only SPA is **not ready** for 1M rows. The single biggest blocker is the `fetchAllPages` function (`src/services/apiUtils.js:18`) which recursively fetches **all** pages from every paginated API endpoint into client memory. Combined with no server-side pagination UI, no virtualization, row-by-row attendance writes, zero code splitting, and a single 569 KB JS bundle, the application will crash the browser tab well before reaching 100K rows. The backend (Laravel, not in this repo) is a separate unknown; no indexes, connection pooling, caching, or rate limiting can be verified from this codebase.

---

## Category Scores

### A. Database & API Layer (0/8 PASS) — 0 PASS | 2 WARN | 6 FAIL

| # | Check | Score | Evidence | Recommendation |
|---|---|---|---|---|
| A1 | **Pagination is server-side** | **FAIL** | `fetchAllPages` recursively fetches ALL pages into memory (`src/services/apiUtils.js:18-33`). Used by 5+ endpoints. No `LIMIT`/`page` params passed to API calls. | Replace `fetchAllPages` with server-side pagination. Pass `page`/`perPage` to API, render one page at a time. |
| A2 | **Indexes on queried columns** | **FAIL** | No schema/migration files in repo (frontend only). No evidence of database indexes. | Verify Laravel migrations have indexes on `driver_id`, `user_id`, `bus_id`, `student_id`, `date`, `status`. |
| A3 | **No N+1 queries** | **WARN** | No frontend-side N+1 loops found. But `fetchAllPages` + Laravel eager loading (inferred `route.students`, `route.buses`, `route.driver` in API responses) may cause N+1 on the backend. | Verify backend uses `with()` for eager loading. Check `fetchAllPages` doesn't trigger per-page queries. |
| A4 | **Query timeouts & connection pooling** | **FAIL** | No `AbortController.timeout`, no timeout param on any `fetch()` call. No connection pooling config in this repo. | Add `AbortSignal.timeout(10000)` to all API fetches. Configure DB pool on backend. |
| A5 | **Aggregations use DB, not app code** | **WARN** | `targetRoute.students.length` (count) is computed client-side from fetched data (`routeApi.js:228`). No backend aggregation endpoints called. | Move COUNT/SUM operations to backend SQL. Add dedicated `/api/routes/{id}/stats` endpoint. |
| A6 | **Bulk operations exist** | **FAIL** | `updateStudentAttendance` sends **one POST per student** (`routeApi.js:263-286`). `handleMarkAllForStop` calls it in a loop (`MyRoutePage.jsx:98-100`). | Replace with `POST /api/operations/attendance/bulk` accepting a `[{student_id, status}]` array. |
| A7 | **No loading all rows for dropdowns** | **FAIL** | `fetchAllPages` loads ALL buses into `<select>` dropdown (`MaintenanceModal.jsx:117-121`). Same for all routes and maintenance requests. | Add server-side search to bus dropdown, or limit to top 100 with search-as-you-type. |
| A8 | **Rate limiting & throttling** | **FAIL** | No evidence of rate limiting, request size limits, or response size limits. No `Retry-After` handling. | Implement rate limiting on backend (Laravel `throttle` middleware). Add frontend retry logic. |

### B. Data Fetching & State (3/6 PASS) — 3 PASS | 1 WARN | 2 FAIL

| # | Check | Score | Evidence | Recommendation |
|---|---|---|---|---|
| B1 | **Server-state library with caching** | **WARN** | TanStack React Query used (`package.json:14`). But `staleTime: 0` on all hooks (`useDriverRoute.js:10`, `useDriverDashboard.js:11`, `useDriverSchedule.js:8`) negates caching benefit. | Set `staleTime: 30000` (30s) for route data, `staleTime: 60000` for schedules. |
| B2 | **Pagination state is URL-driven** | **FAIL** | No URL search params for pagination. No page state in URL. Back button won't preserve page. | Add `?page=` to URL via `useSearchParams` for future paginated views. |
| B3 | **Search/filter is server-side** | **FAIL** | No search inputs exist anywhere. `assignedRoutes.filter()` is client-side (`routeApi.js:98-111`). | Add API-backed search params (`?search=`). Remove client-side `Array.filter()` on full datasets. |
| B4 | **Request deduplication** | **PASS** | TanStack Query deduplicates identical `queryKey` requests by default. Multiple `GET /api/routes` calls across hooks share cache. | Ensure consistent `queryKey` naming. |
| B5 | **Optimistic updates or background refetch** | **PASS** | Attendance mutation uses `invalidateQueries` on success (`useDriverRoute.js:18-19`). No full page reloads. | Add optimistic update for faster UX: `onMutate` to set local attendance instantly. |
| B6 | **No waterfall requests** | **PASS** | `fetchDriverWeeklyScheduleData` uses `Promise.all` for 4 parallel fetches (`routeApi.js:323-328`). Dashboard fetches routes and schedules sequentially (not nested). | Dashboard could use `Promise.all` too for parallel fetch. |

### C. Rendering Performance (1/6 PASS) — 1 PASS | 1 WARN | 4 FAIL

| # | Check | Score | Evidence | Recommendation |
|---|---|---|---|---|
| C1 | **Virtualization / Windowing** | **FAIL** | No virtualization library installed. `stops.map()` renders every stop as full DOM node (`MyRoutePage.jsx:604-827`). At 10K stops, DOM would freeze. | Add `@tanstack/react-virtual` to virtualize the stop list. Only render visible rows. |
| C2 | **Pagination UI handles 100K+ pages** | **FAIL** | No pagination UI exists at all. No page buttons, no ellipsis, no "Go to page" input. | Add server-side pagination with ellipsis-based page selector. |
| C3 | **Images are lazy-loaded** | **PASS** | Only small SVGs used (favicon, icons.svg, hero.png not loaded in app). No large images. | Already fine. |
| C4 | **No uncontrolled re-renders** | **WARN** | Extensive inline styles (e.g., `MyRoutePage.jsx` ~200 inline `style={{}}` objects), inline arrow functions in `onMouseEnter`/`onMouseLeave` (lines 244-251, 557-558). Each creates new object/function per render. | Extract styles to CSS classes. Use `useCallback` for event handlers. |
| C5 | **Debounced search inputs** | **FAIL** | No search inputs exist. N/A but still: no debounce pattern observed anywhere. | N/A until search is added. |
| C6 | **Loading/empty/error states for every view** | **PASS** | Every page handles `isLoading`, `error`, and empty states: `DriverDashboardPage.jsx:13-21`, `MyRoutePage.jsx:130-162`, `DriverSchedulePage.jsx:70-78`, `MaintenancePage.jsx:44-53`. | Already well-implemented. |

### D. Bundle & Asset Optimization (1/5 PASS) — 1 PASS | 1 WARN | 3 FAIL

| # | Check | Score | Evidence | Recommendation |
|---|---|---|---|---|
| D1 | **Code splitting** | **FAIL** | No `React.lazy()` or dynamic `import()` anywhere. All components imported statically in `App.jsx:5-9`. Entire app is one JS request. | Use `React.lazy(() => import(...))` for route-level splitting: `MyRoutePage`, `DriverSchedulePage`, `MaintenancePage`. |
| D2 | **Vendor chunking** | **FAIL** | `vite.config.js:5-7` has no `build.rollupOptions.output.manualChunks`. React, Leaflet, TanStack Query all in one bundle. | Add `manualChunks: { vendor: ['react','react-dom','react-router-dom'], query: ['@tanstack/react-query'], leaflet: ['leaflet'] }` |
| D3 | **Tree shaking** | **PASS** | All imports are specific: `import { Bus, Map, GraduationCap, Wrench } from 'lucide-react'`. No `import *` patterns. | Maintain this pattern. |
| D4 | **Asset optimization** | **WARN** | Leaflet CSS (`leaflet/dist/leaflet.css`) imported whole (`RouteMap.jsx:3`). PNG marker assets imported (`RouteMap.jsx:5-7`). | Use Leaflet CDN with subset assets, or lazy-load RouteMap component. |
| D5 | **Bundle size** | **FAIL** | Main JS: **569 KB** raw (`dist/assets/index-DX-ASXNR.js`). CSS: **50 KB** raw. Total initial load ~619 KB raw (~200+ KB gzipped). No code splitting. | Split into route-based chunks (D1+D2). Target main bundle < 150 KB gzipped. |

### E. Infrastructure & Operations (0/6 PASS) — 0 PASS | 0 WARN | 6 FAIL

| # | Check | Score | Evidence | Recommendation |
|---|---|---|---|---|
| E1 | **Database read replicas** | **FAIL** | No evidence. No DB config in this repo. Single `VITE_API_BASE_URL` env var points to one backend. | Add read replica connection in Laravel config for read-heavy endpoints. |
| E2 | **Caching layer** | **FAIL** | No Redis/Memcached config. No `Cache-Control` headers managed by frontend. TanStack Query cache disabled (`staleTime: 0`). | Use Laravel cache (Redis) for route/bus/schedule data. Add `Cache-Control: max-age=60` to API responses. |
| E3 | **Horizontal scaling** | **FAIL** | Auth is localStorage/sessionStorage-based (no refresh token). No shared session store. App is deployed as static site (`.do/app.yaml`) — stateless by design for frontend, but backend scaling unknown. | Ensure Laravel backend is stateless (JWT/sanctum). Verify DigitalOcean App Platform auto-scales. |
| E4 | **Logging & monitoring** | **FAIL** | No Sentry, DataDog, or error tracking integration. Only `console.warn` in catch blocks. No structured logging. | Add Sentry for frontend error tracking. Enable Laravel slow query logging. |
| E5 | **Backup & recovery** | **FAIL** | No evidence of backup strategy. No migration or seed files in this repo. | Set up automated MySQL/MongoDB backups. Document recovery procedure. |
| E6 | **Load testing experience** | **FAIL** | No load test scripts, no CI performance budgets, no k6/Artillery/Locust files. | Write k6 script for `/api/routes`, `/api/driver/schedule`, attendance POST. Add Lighthouse CI budget. |

---

## Top 5 Critical Fixes Required BEFORE 1M Rows

1. **Eliminate `fetchAllPages` — implement true server-side pagination** (`src/services/apiUtils.js:18-33`)
   This recursive function fetches every page from every paginated endpoint into client memory. At 1M rows (e.g., maintenance requests), this would issue 10K+ sequential HTTP requests and hold arrays of 1M objects in RAM. Replace every call with a single-page fetch, add `page`/`perPage` query params, and render a paginated UI.
   ```diff
   - const allRoutes = await fetchAllPages(`${API_BASE_URL}/routes`, headers);
   + const response = await fetch(`${API_BASE_URL}/routes?page=1&perPage=25`, { headers });
   ```

2. **Replace row-by-row attendance with bulk API** (`src/features/dashboard/api/routeApi.js:263-286`, `src/features/dashboard/pages/MyRoutePage.jsx:98-100`)
   Each student attendance is a separate HTTP POST. On a route with 60 students, `handleMarkAllForStop` fires 60 sequential requests. Create a single `POST /api/operations/attendance/bulk` that accepts `{ attendances: [{ student_id, status }, ...] }` and call it once per stop.

3. **Add code splitting and vendor chunking** (`src/App.jsx:5-9`, `vite.config.js:5-7`)
   All components are eagerly loaded, producing a single 569 KB bundle. Use `React.lazy()` for route-level components and add `manualChunks` in Vite config:
   ```js
   build: { rollupOptions: { output: { manualChunks: { vendor: ['react','react-dom'], query: ['@tanstack/react-query'], leaflet: ['leaflet'] } } } }
   ```

4. **Set real caching (`staleTime > 0`) on TanStack Query hooks** (`src/features/dashboard/hooks/useDriverRoute.js:10`, `useDriverDashboard.js:11`, `useDriverSchedule.js:8`)
   All hooks use `staleTime: 0`, meaning they refetch on every mount regardless of whether data changed. Set `staleTime: 30000` for route data (changes infrequently within a shift) and `staleTime: 60000` for schedules.

5. **Virtualize the stop list** (`src/features/dashboard/pages/MyRoutePage.jsx:604-827`)
   All stops render as full DOM nodes. A route with 10 stops is fine, but the pattern is unbounded. Install `@tanstack/react-virtual` and wrap the `stops.map()` in a virtualizer that only renders visible rows.

---

## Quick Wins (Low Effort, High Impact)

- [ ] Set `staleTime: 30000` on `useDriverRoute`, `useDriverDashboard`, `useDriverSchedule` — reduces API calls by ~90% on navigation (5 min)
- [ ] Add `AbortSignal.timeout(10000)` to all `fetch()` calls — prevents hung requests from accumulating (5 min per file)
- [ ] Extract inline `style={{}}` objects to CSS classes — reduces re-render cost (15 min via search/replace)
- [ ] Replace `fetchAllPages` with paginated single-page fetch for bus dropdown (`MaintenanceModal.jsx:117`) — buses are a small dataset but sets the pattern (10 min)
- [ ] Add `manualChunks` to vite.config.js — instantly splits bundle into vendor/app chunks (2 min)

---

## Estimated Effort

| Area | Hours (est.) |
|---|---|
| Database changes | 16h (backend work, not in this repo) |
| API changes | 24h (add bulk attendance, paginated endpoints, aggregation endpoints) |
| Frontend changes | 32h (remove fetchAllPages, add pagination UI, virtualization, code splitting, caching) |
| Infrastructure | 8h (Sentry, caching, load testing) |
| Testing & validation | 12h (k6 load test, pagination edge cases, bulk attendance perf test) |
| **Total** | **92h** |

---

> **Anti-Patterns Flagged:** `fetchAllPages` (apiUtils.js:18) — loads ALL rows into client memory. `updateStudentAttendance` called in a loop (MyRoutePage.jsx:98-100) — row-by-row writes. Single 569 KB JS bundle with no code splitting (dist/assets/index-DX-ASXNR.js). No virtualization for list rendering. Client-side `.filter()` on full fetched arrays (routeApi.js:98-111).
