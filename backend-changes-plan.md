# Backend Changes Plan

## Priority 1: Fix `/api/operations/attendance/bulk` (500 error)

**File:** `app/Http/Controllers/OperationsController.php` (or equivalent)

Add the bulk store method. The 500 means the route exists but the controller method is missing or broken.

```php
public function bulkAttendance(Request $request)
{
    $validated = $request->validate([
        'attendances' => 'required|array|min:1',
        'attendances.*.student_id' => 'required|integer|exists:students,student_id',
        'attendances.*.status' => 'required|string|in:Boarded,Dropped Off,Absent',
        'attendances.*.date' => 'sometimes|date',
        'attendances.*.recorded_by' => 'sometimes|integer',
    ]);

    $records = [];
    foreach ($validated['attendances'] as $a) {
        $records[] = [
            'student_id'  => $a['student_id'],
            'date'        => $a['date'] ?? now()->toDateString(),
            'status'      => $a['status'],
            'recorded_by' => $a['recorded_by'] ?? auth()->id(),
            'created_at'  => now(),
            'updated_at'  => now(),
        ];
    }

    Attendance::insert($records);

    return response()->json(['inserted' => count($records)]);
}
```

**Route** (`routes/api.php`):
```php
Route::post('/operations/attendance/bulk', [OperationsController::class, 'bulkAttendance']);
```

---

## Priority 2: Add `?driver_id=` filter to `GET /api/routes`

**File:** `app/Http/Controllers/RouteController.php`

Currently the frontend fetches ALL routes then filters client-side. Add server-side filtering:

```php
public function index(Request $request)
{
    $query = Route::with(['driver', 'buses', 'students']);

    if ($request->filled('driver_id')) {
        $id = $request->driver_id;
        $query->where(function ($q) use ($id) {
            $q->where('driver_id', $id)
              ->orWhereHas('driver', fn($q) => $q->where('user_id', $id))
              ->orWhereHas('buses', fn($q) => $q->whereHas('schedule', fn($q) => $q->where('driver_id', $id)));
        });
    }

    return $query->paginate(min($request->per_page ?? 50, 100));
}
```

This lets the frontend call `GET /api/routes?driver_id=5&per_page=50` and get only that driver's routes, eliminating the need to fetch everything.

---

## Priority 3: Database indexes

**File:** `database/migrations/xxxx_xx_xx_add_indexes.php`

Create a new migration for performance indexes:

```php
Schema::table('routes', function (Blueprint $table) {
    $table->index('driver_id');
});

Schema::table('attendance_records', function (Blueprint $table) {
    $table->index(['student_id', 'date']);
    $table->index('recorded_by');
    $table->index('status');
});

Schema::table('driver_schedules', function (Blueprint $table) {
    $table->index('driver_id');
    $table->index('bus_id');
});

Schema::table('maintenance_requests', function (Blueprint $table) {
    $table->index('bus_id');
    $table->index('status');
    $table->index('priority');
});

Schema::table('student_route', function (Blueprint $table) {
    $table->index('student_id');
    $table->index('route_id');
});
```

---

## Priority 4: Rate limiting on API routes

**File:** `app/Http/Kernel.php` (or `routes/api.php` using Laravel 11's bootstrap/app.php)

```php
// bootstrap/app.php for Laravel 11+
->withMiddleware(function (Middleware $middleware) {
    $middleware->api(throttle: '60,1'); // 60 requests per minute per IP
})

// Or in routes/api.php for older Laravel
Route::middleware('throttle:60,1')->group(function () {
    // all API routes
});
```

---

## Execution Order

| Step | Description | Est. Time |
|------|-------------|-----------|
| 1 | Fix `bulkAttendance` controller method | 10 min |
| 2 | Add `?driver_id=` filter to RouteController | 10 min |
| 3 | Create and run index migration | 5 min |
| 4 | Add rate limiting middleware | 5 min |
| 5 | Test with a bulk attendance POST via Postman/curl | 5 min |
| **Total** | | **~35 min** |
