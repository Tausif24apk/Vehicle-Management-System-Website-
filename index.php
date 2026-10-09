<?php
// =====================================================================
// Vehicle Rental Management System (VRMS)
// Consolidated Backend RESTful API Router
// Single-File API Engine for All Roles & Endpoints
// =====================================================================

header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// ---------------------------------------------------------------------
// DATABASE CONFIGURATION (PDO)
// ---------------------------------------------------------------------
$host = '127.0.0.1';
$db   = 'vrms_db';
$user = 'root';
$pass = '';
$charset = 'utf8mb4';

$dsn = "mysql:host=$host;dbname=$db;charset=$charset";
$options = [
    PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    PDO::ATTR_EMULATE_PREPARES   => false,
];

$pdo = null;
$dbConnected = false;
$dbError = null;

try {
    $pdo = new PDO($dsn, $user, $pass, $options);
    $dbConnected = true;
} catch (\PDOException $e) {
    $dbError = $e->getMessage();
}

// ---------------------------------------------------------------------
// HELPER FUNCTIONS
// ---------------------------------------------------------------------
function sendJson($data, $statusCode = 200) {
    http_response_code($statusCode);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
    exit;
}

function getJsonInput() {
    $raw = file_get_contents('php://input');
    return json_decode($raw, true) ?? [];
}

function ensureDb($pdo, $dbError) {
    if (!$pdo) {
        sendJson([
            'status' => 'error',
            'message' => 'Database connection failed: ' . $dbError,
            'hint' => 'Ensure MySQL is running and database vrms_db is created using index.sql'
        ], 500);
    }
}

// ---------------------------------------------------------------------
// ROUTER & ENDPOINT DETECTION
// ---------------------------------------------------------------------
$endpoint = strtolower($_GET['endpoint'] ?? $_GET['api'] ?? '');
if (empty($endpoint) && !empty($_SERVER['PATH_INFO'])) {
    $parts = explode('/', trim($_SERVER['PATH_INFO'], '/'));
    $endpoint = strtolower($parts[0] ?? '');
}

$method = $_SERVER['REQUEST_METHOD'];

// ---------------------------------------------------------------------
// ROOT / STATUS / API EXPLORER
// ---------------------------------------------------------------------
if (empty($endpoint) || $endpoint === 'status' || $endpoint === 'help') {
    if (isset($_GET['format']) && $_GET['format'] === 'json') {
        sendJson([
            'system' => 'Vehicle Rental Management System (VRMS)',
            'version' => '2.0.0',
            'database_connected' => $dbConnected,
            'database_error' => $dbError,
            'endpoints' => [
                'auth' => ['GET (check)', 'POST ?action=login', 'POST ?action=register'],
                'vehicles' => ['GET', 'GET ?id={id}', 'GET ?city={city}&type={type}', 'POST'],
                'bookings' => ['GET ?user_id={id}', 'GET ?owner_id={id}', 'POST (with conflict check)', 'PUT'],
                'payments' => ['GET ?user_id={id}', 'POST', 'PUT ?status=approved'],
                'reviews' => ['GET ?vehicle_id={id}', 'GET ?driver_id={id}', 'POST'],
                'trips' => ['GET ?driver_id={id}', 'POST ?action=start_trip|complete_trip'],
                'fuel' => ['GET ?vehicle_id={id}', 'GET ?driver_id={id}', 'POST'],
                'maintenance' => ['GET ?vehicle_id={id}', 'POST', 'PUT ?status=resolved'],
                'complaints' => ['GET ?user_id={id}', 'POST', 'PUT ?status=resolved'],
                'leaves' => ['GET ?driver_id={id}', 'POST', 'PUT ?status=approved'],
                'documents' => ['GET ?vehicle_id={id}', 'POST', 'PUT ?status=verified'],
                'announcements' => ['GET ?role={role}', 'POST']
            ]
        ]);
    }

    // Interactive HTML API Explorer
    header('Content-Type: text/html; charset=utf-8');
    ?>
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>VRMS — Backend RESTful API Engine</title>
        <style>
            :root {
                --bg: #0d1117; --surface: #161b22; --border: #30363d;
                --accent: #2563eb; --accent-hover: #1d4ed8; --text: #e6edf3;
                --text-muted: #8b949e; --green: #238636; --red: #da3633; --orange: #d29922;
            }
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: var(--bg); color: var(--text); margin: 0; padding: 30px 20px; line-height: 1.5; }
            .container { max-width: 1000px; margin: 0 auto; }
            .header { display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid var(--border); padding-bottom: 20px; margin-bottom: 25px; flex-wrap: wrap; gap: 15px; }
            .title h1 { margin: 0 0 6px 0; font-size: 24px; }
            .badge { display: inline-block; padding: 4px 10px; border-radius: 20px; font-size: 13px; font-weight: 600; }
            .badge-success { background: rgba(35, 134, 54, 0.2); color: #3fb950; border: 1px solid rgba(35, 134, 54, 0.4); }
            .badge-danger { background: rgba(218, 54, 51, 0.2); color: #f85149; border: 1px solid rgba(218, 54, 51, 0.4); }
            .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 16px; margin-top: 20px; }
            .card { background: var(--surface); border: 1px solid var(--border); border-radius: 8px; padding: 18px; }
            .card h3 { margin: 0 0 10px 0; font-size: 16px; display: flex; justify-content: space-between; align-items: center; }
            .card p { margin: 0 0 12px 0; font-size: 13px; color: var(--text-muted); }
            .endpoint-url { background: #090d13; border: 1px solid var(--border); padding: 8px 12px; border-radius: 6px; font-family: monospace; font-size: 13px; word-break: break-all; }
            .endpoint-url a { color: #58a6ff; text-decoration: none; }
            .endpoint-url a:hover { text-decoration: underline; }
            .methods { display: flex; gap: 6px; margin-bottom: 10px; }
            .m-get { background: #1f6feb; color: #fff; padding: 2px 7px; border-radius: 4px; font-size: 11px; font-weight: 700; }
            .m-post { background: #238636; color: #fff; padding: 2px 7px; border-radius: 4px; font-size: 11px; font-weight: 700; }
            .m-put { background: #d29922; color: #fff; padding: 2px 7px; border-radius: 4px; font-size: 11px; font-weight: 700; }
            .btn { display: inline-block; background: var(--accent); color: white; padding: 8px 16px; border-radius: 6px; text-decoration: none; font-size: 14px; font-weight: 600; }
            .btn:hover { background: var(--accent-hover); }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <div class="title">
                    <h1>🚗 VRMS Consolidated Backend API Engine</h1>
                    <div style="color:var(--text-muted);font-size:14px;">Unified RESTful Engine for Customer, Driver, Owner, and Admin</div>
                </div>
                <div>
                    <?php if ($dbConnected): ?>
                        <span class="badge badge-success">✓ MySQL Connected (vrms_db)</span>
                    <?php else: ?>
                        <span class="badge badge-danger">✕ MySQL Disconnected</span>
                    <?php endif; ?>
                    <a href="index.html" class="btn" style="margin-left:10px;">Launch Frontend Web App →</a>
                </div>
            </div>

            <?php if (!$dbConnected): ?>
            <div style="background:rgba(218,54,51,0.15);border:1px solid var(--red);padding:14px;border-radius:8px;margin-bottom:20px;">
                <strong>Database Notice:</strong> <?php echo htmlspecialchars($dbError); ?><br>
                <small style="color:var(--text-muted)">Import <code>index.sql</code> in phpMyAdmin or MySQL to enable live database operations.</small>
            </div>
            <?php endif; ?>

            <div class="grid">
                <!-- Auth -->
                <div class="card">
                    <div class="methods"><span class="m-post">POST</span></div>
                    <h3>1. Authentication <span>🔐</span></h3>
                    <p>Login & registration with strict single-admin protection rule.</p>
                    <div class="endpoint-url">index.php?endpoint=auth&action=login</div>
                </div>

                <!-- Vehicles -->
                <div class="card">
                    <div class="methods"><span class="m-get">GET</span><span class="m-post">POST</span></div>
                    <h3>2. Vehicles & Slots <span>🚘</span></h3>
                    <p>Location search, next unavailable slot query, and fleet listings.</p>
                    <div class="endpoint-url"><a href="index.php?endpoint=vehicles">index.php?endpoint=vehicles</a></div>
                </div>

                <!-- Bookings -->
                <div class="card">
                    <div class="methods"><span class="m-get">GET</span><span class="m-post">POST</span><span class="m-put">PUT</span></div>
                    <h3>3. Bookings & Conflicts <span>📅</span></h3>
                    <p>Reservation requests with date overlap conflict prevention.</p>
                    <div class="endpoint-url"><a href="index.php?endpoint=bookings">index.php?endpoint=bookings</a></div>
                </div>

                <!-- Payments -->
                <div class="card">
                    <div class="methods"><span class="m-get">GET</span><span class="m-post">POST</span><span class="m-put">PUT</span></div>
                    <h3>4. Payments & Billing <span>💳</span></h3>
                    <p>Digital payments (bKash/Nagad) and admin transaction approval.</p>
                    <div class="endpoint-url"><a href="index.php?endpoint=payments">index.php?endpoint=payments</a></div>
                </div>

                <!-- Reviews -->
                <div class="card">
                    <div class="methods"><span class="m-get">GET</span><span class="m-post">POST</span></div>
                    <h3>5. Reviews & Ratings <span>⭐</span></h3>
                    <p>Dual rating and feedback system for both vehicle and driver.</p>
                    <div class="endpoint-url"><a href="index.php?endpoint=reviews">index.php?endpoint=reviews</a></div>
                </div>

                <!-- Trips -->
                <div class="card">
                    <div class="methods"><span class="m-get">GET</span><span class="m-post">POST</span></div>
                    <h3>6. Trip Logging <span>🗺️</span></h3>
                    <p>Driver schedules, odometer start & completion tracking.</p>
                    <div class="endpoint-url"><a href="index.php?endpoint=trips&driver_id=1">index.php?endpoint=trips</a></div>
                </div>

                <!-- Fuel -->
                <div class="card">
                    <div class="methods"><span class="m-get">GET</span><span class="m-post">POST</span></div>
                    <h3>7. Fuel Logs <span>⛽</span></h3>
                    <p>Fuel consumption logging, odometer entries, and mileage costs.</p>
                    <div class="endpoint-url"><a href="index.php?endpoint=fuel">index.php?endpoint=fuel</a></div>
                </div>

                <!-- Maintenance -->
                <div class="card">
                    <div class="methods"><span class="m-get">GET</span><span class="m-post">POST</span><span class="m-put">PUT</span></div>
                    <h3>8. Maintenance <span>🔧</span></h3>
                    <p>Defect reporting, severity tagging, repair cost and resolution.</p>
                    <div class="endpoint-url"><a href="index.php?endpoint=maintenance">index.php?endpoint=maintenance</a></div>
                </div>

                <!-- Complaints -->
                <div class="card">
                    <div class="methods"><span class="m-get">GET</span><span class="m-post">POST</span><span class="m-put">PUT</span></div>
                    <h3>9. Support Tickets <span>🎫</span></h3>
                    <p>Customer, driver, and owner complaint filing & resolutions.</p>
                    <div class="endpoint-url"><a href="index.php?endpoint=complaints">index.php?endpoint=complaints</a></div>
                </div>

                <!-- Leaves -->
                <div class="card">
                    <div class="methods"><span class="m-get">GET</span><span class="m-post">POST</span><span class="m-put">PUT</span></div>
                    <h3>10. Driver Leaves <span>🏖️</span></h3>
                    <p>Driver availability schedules and leave management.</p>
                    <div class="endpoint-url"><a href="index.php?endpoint=leaves">index.php?endpoint=leaves</a></div>
                </div>

                <!-- Documents -->
                <div class="card">
                    <div class="methods"><span class="m-get">GET</span><span class="m-post">POST</span><span class="m-put">PUT</span></div>
                    <h3>11. Compliance Docs <span>📄</span></h3>
                    <p>Vehicle registration, fitness, insurance and expiry warnings.</p>
                    <div class="endpoint-url"><a href="index.php?endpoint=documents">index.php?endpoint=documents</a></div>
                </div>

                <!-- Announcements -->
                <div class="card">
                    <div class="methods"><span class="m-get">GET</span><span class="m-post">POST</span></div>
                    <h3>12. Announcements <span>📢</span></h3>
                    <p>System notification center and broadcast announcements.</p>
                    <div class="endpoint-url"><a href="index.php?endpoint=announcements">index.php?endpoint=announcements</a></div>
                </div>
            </div>
        </div>
    </body>
    </html>
    <?php
    exit;
}

// Ensure database is available for API actions
ensureDb($pdo, $dbError);

// =====================================================================
// 1. AUTH API
// =====================================================================
if ($endpoint === 'auth') {
    $action = $_GET['action'] ?? '';
    $input = getJsonInput();

    if ($action === 'register') {
        $fullName = trim($input['name'] ?? '');
        $email    = strtolower(trim($input['email'] ?? ''));
        $phone    = trim($input['phone'] ?? '');
        $password = $input['pass'] ?? '';
        $roleName = strtolower(trim($input['role'] ?? 'user'));

        if ($roleName === 'admin') {
            sendJson(['status' => 'error', 'message' => 'Administrator accounts cannot be registered. Only the primary administrator is permitted.'], 403);
        }

        if (empty($fullName) || empty($email) || empty($password)) {
            sendJson(['status' => 'error', 'message' => 'Name, email, and password are required.'], 400);
        }

        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
            sendJson(['status' => 'error', 'message' => 'Invalid email address.'], 400);
        }

        // Check duplicate email
        $stmt = $pdo->prepare("SELECT user_id FROM users WHERE email = ?");
        $stmt->execute([$email]);
        if ($stmt->fetch()) {
            sendJson(['status' => 'error', 'message' => 'Email is already registered.'], 409);
        }

        // Lookup role_id
        $stmt = $pdo->prepare("SELECT role_id FROM roles WHERE role_name = ?");
        $stmt->execute([$roleName]);
        $role = $stmt->fetch();
        if (!$role) {
            sendJson(['status' => 'error', 'message' => 'Invalid role selected.'], 400);
        }
        $roleId = $role['role_id'];

        $passwordHash = hash('sha256', $password . 'vhub_salt_2025');

        $stmt = $pdo->prepare("INSERT INTO users (role_id, full_name, email, phone, password_hash) VALUES (?, ?, ?, ?, ?)");
        $stmt->execute([$roleId, $fullName, $email, $phone, $passwordHash]);
        $userId = $pdo->lastInsertId();

        if ($roleName === 'driver') {
            $license = trim($input['license'] ?? ('DL-' . strtoupper(substr(md5(uniqid()), 0, 8))));
            $experience = intval($input['experience'] ?? 2);
            $stmtDr = $pdo->prepare("INSERT INTO drivers (user_id, license_number, experience_years) VALUES (?, ?, ?)");
            $stmtDr->execute([$userId, $license, $experience]);
        }

        sendJson([
            'status' => 'success',
            'message' => 'Registration successful! Please log in.',
            'user_id' => $userId
        ], 201);
    }

    if ($action === 'login') {
        $email    = strtolower(trim($input['email'] ?? ''));
        $password = $input['pass'] ?? '';

        if (empty($email) || empty($password)) {
            sendJson(['status' => 'error', 'message' => 'Email and password are required.'], 400);
        }

        $passwordHash = hash('sha256', $password . 'vhub_salt_2025');

        $stmt = $pdo->prepare("
            SELECT u.user_id, u.full_name, u.email, u.phone, u.status, r.role_name, d.driver_id, d.license_number
            FROM users u
            JOIN roles r ON u.role_id = r.role_id
            LEFT JOIN drivers d ON u.user_id = d.user_id
            WHERE u.email = ? AND u.password_hash = ?
        ");
        $stmt->execute([$email, $passwordHash]);
        $user = $stmt->fetch();

        if (!$user) {
            sendJson(['status' => 'error', 'message' => 'Invalid email or password.'], 401);
        }

        if ($user['status'] !== 'active') {
            sendJson(['status' => 'error', 'message' => 'Account is suspended or inactive.'], 403);
        }

        sendJson([
            'status' => 'success',
            'message' => 'Login successful',
            'user' => [
                'id' => $user['user_id'],
                'name' => $user['full_name'],
                'email' => $user['email'],
                'phone' => $user['phone'],
                'role' => $user['role_name'],
                'driver_id' => $user['driver_id'] ?? null,
                'license' => $user['license_number'] ?? null
            ]
        ]);
    }

    sendJson(['status' => 'error', 'message' => 'Invalid auth action.'], 400);
}

// =====================================================================
// 2. VEHICLES API
// =====================================================================
if ($endpoint === 'vehicles') {
    if ($method === 'GET') {
        $vehicleId = $_GET['id'] ?? null;

        if ($vehicleId) {
            $stmt = $pdo->prepare("
                SELECT v.*, l.hub_name, l.city, l.address,
                       COALESCE(ROUND(AVG(r.vehicle_rating), 1), 5.0) AS avg_rating,
                       COUNT(r.review_id) AS total_reviews
                FROM vehicles v
                JOIN locations l ON v.location_id = l.location_id
                LEFT JOIN reviews r ON v.vehicle_id = r.vehicle_id
                WHERE v.vehicle_id = ?
                GROUP BY v.vehicle_id, l.location_id
            ");
            $stmt->execute([$vehicleId]);
            $vehicle = $stmt->fetch();

            if (!$vehicle) {
                sendJson(['status' => 'error', 'message' => 'Vehicle not found.'], 404);
            }

            // Query next unavailable slot
            $slotStmt = $pdo->prepare("
                SELECT start_date, end_date, booking_status
                FROM trips_bookings
                WHERE vehicle_id = ? 
                  AND booking_status IN ('pending', 'approved', 'active')
                  AND end_date >= CURRENT_DATE
                ORDER BY start_date ASC
                LIMIT 1
            ");
            $slotStmt->execute([$vehicleId]);
            $nextSlot = $slotStmt->fetch();

            $vehicle['next_unavailable_slot'] = $nextSlot ? [
                'from' => $nextSlot['start_date'],
                'to' => $nextSlot['end_date'],
                'status' => $nextSlot['booking_status']
            ] : null;

            sendJson(['status' => 'success', 'data' => $vehicle]);
        }

        // List & filter vehicles
        $city = $_GET['city'] ?? null;
        $locationId = $_GET['location_id'] ?? null;
        $vehicleType = $_GET['type'] ?? null;
        $search = $_GET['q'] ?? null;
        $ownerId = $_GET['owner_id'] ?? null;

        $query = "
            SELECT v.*, l.hub_name, l.city, l.address,
                   COALESCE(ROUND(AVG(r.vehicle_rating), 1), 5.0) AS avg_rating,
                   COUNT(DISTINCT r.review_id) AS total_reviews,
                   (
                       SELECT CONCAT(b.start_date, ' to ', b.end_date)
                       FROM trips_bookings b
                       WHERE b.vehicle_id = v.vehicle_id 
                         AND b.booking_status IN ('pending', 'approved', 'active')
                         AND b.end_date >= CURRENT_DATE
                       ORDER BY b.start_date ASC
                       LIMIT 1
                   ) AS next_booked_slot
            FROM vehicles v
            JOIN locations l ON v.location_id = l.location_id
            LEFT JOIN reviews r ON v.vehicle_id = r.vehicle_id
            WHERE 1=1
        ";

        $params = [];
        if ($ownerId) {
            $query .= " AND v.owner_id = ?";
            $params[] = $ownerId;
        } else {
            $query .= " AND v.status = 'available'";
        }

        if ($city && $city !== 'all') {
            $query .= " AND l.city = ?";
            $params[] = $city;
        }
        if ($locationId && $locationId !== 'all') {
            $query .= " AND v.location_id = ?";
            $params[] = $locationId;
        }
        if ($vehicleType && $vehicleType !== 'all') {
            $query .= " AND v.vehicle_type = ?";
            $params[] = $vehicleType;
        }
        if ($search) {
            $query .= " AND (v.model_name LIKE ? OR v.registration_no LIKE ? OR l.hub_name LIKE ?)";
            $wildcard = "%$search%";
            $params[] = $wildcard;
            $params[] = $wildcard;
            $params[] = $wildcard;
        }

        $query .= " GROUP BY v.vehicle_id, l.location_id ORDER BY v.daily_rate ASC";
        $stmt = $pdo->prepare($query);
        $stmt->execute($params);
        $vehicles = $stmt->fetchAll();

        sendJson(['status' => 'success', 'data' => $vehicles]);
    }

    if ($method === 'POST') {
        $input = getJsonInput();
        $ownerId    = $input['owner_id'] ?? null;
        $locationId = $input['location_id'] ?? 1;
        $modelName  = trim($input['model_name'] ?? '');
        $type       = $input['vehicle_type'] ?? 'Sedan';
        $regNo      = trim($input['registration_no'] ?? '');
        $price      = floatval($input['daily_rate'] ?? 0);
        $seats      = intval($input['seats'] ?? 4);
        $fuel       = $input['fuel_type'] ?? 'Octane';
        $icon       = $input['image_icon'] ?? '🚗';

        if (!$ownerId || empty($modelName) || $price <= 0) {
            sendJson(['status' => 'error', 'message' => 'Owner ID, Model Name, and positive Daily Rate are required.'], 400);
        }

        $stmt = $pdo->prepare("
            INSERT INTO vehicles (owner_id, location_id, model_name, vehicle_type, registration_no, daily_rate, seats, fuel_type, image_icon, status)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'available')
        ");
        $stmt->execute([$ownerId, $locationId, $modelName, $type, $regNo, $price, $seats, $fuel, $icon]);

        sendJson(['status' => 'success', 'message' => 'Vehicle added successfully!', 'id' => $pdo->lastInsertId()], 201);
    }
}

// =====================================================================
// 3. BOOKINGS API
// =====================================================================
if ($endpoint === 'bookings') {
    if ($method === 'GET') {
        $userId   = $_GET['user_id'] ?? null;
        $ownerId  = $_GET['owner_id'] ?? null;
        $driverId = $_GET['driver_id'] ?? null;

        $query = "
            SELECT b.*, v.model_name, v.image_icon, v.registration_no,
                   u_cust.full_name AS customer_name, u_cust.phone AS customer_phone,
                   u_dr.full_name AS driver_name, u_dr.phone AS driver_phone,
                   l_pick.hub_name AS pickup_hub, l_drop.hub_name AS dropoff_hub,
                   p.payment_status, p.payment_method, p.transaction_id,
                   r.review_id, r.vehicle_rating, r.driver_rating
            FROM trips_bookings b
            JOIN vehicles v ON b.vehicle_id = v.vehicle_id
            JOIN users u_cust ON b.customer_id = u_cust.user_id
            LEFT JOIN drivers d ON b.driver_id = d.driver_id
            LEFT JOIN users u_dr ON d.user_id = u_dr.user_id
            JOIN locations l_pick ON b.pickup_location_id = l_pick.location_id
            JOIN locations l_drop ON b.dropoff_location_id = l_drop.location_id
            LEFT JOIN payments p ON b.booking_id = p.booking_id
            LEFT JOIN reviews r ON b.booking_id = r.booking_id
            WHERE 1=1
        ";

        $params = [];
        if ($userId) {
            $query .= " AND b.customer_id = ?";
            $params[] = $userId;
        }
        if ($ownerId) {
            $query .= " AND v.owner_id = ?";
            $params[] = $ownerId;
        }
        if ($driverId) {
            $query .= " AND b.driver_id = ?";
            $params[] = $driverId;
        }

        $query .= " ORDER BY b.created_at DESC";
        $stmt = $pdo->prepare($query);
        $stmt->execute($params);
        $bookings = $stmt->fetchAll();

        sendJson(['status' => 'success', 'data' => $bookings]);
    }

    if ($method === 'POST') {
        $input = getJsonInput();
        $customerId = $input['customer_id'] ?? null;
        $vehicleId  = $input['vehicle_id'] ?? null;
        $startDate  = $input['start_date'] ?? null;
        $endDate    = $input['end_date'] ?? null;
        $pickupLoc  = $input['pickup_location_id'] ?? 1;
        $dropoffLoc = $input['dropoff_location_id'] ?? 1;
        $notes      = $input['notes'] ?? '';

        if (!$customerId || !$vehicleId || !$startDate || !$endDate) {
            sendJson(['status' => 'error', 'message' => 'Customer, vehicle, start date, and end date are required.'], 400);
        }

        if (strtotime($endDate) <= strtotime($startDate)) {
            sendJson(['status' => 'error', 'message' => 'End date must be strictly after start date.'], 400);
        }

        // Strict Date Overlap Prevention
        $overlapStmt = $pdo->prepare("
            SELECT booking_id, start_date, end_date 
            FROM trips_bookings
            WHERE vehicle_id = ?
              AND booking_status IN ('pending', 'approved', 'active')
              AND (? < end_date AND ? > start_date)
            LIMIT 1
        ");
        $overlapStmt->execute([$vehicleId, $startDate, $endDate]);
        $overlap = $overlapStmt->fetch();

        if ($overlap) {
            sendJson([
                'status' => 'error',
                'message' => "Vehicle is already booked from {$overlap['start_date']} to {$overlap['end_date']}. Please pick different dates.",
                'conflict' => $overlap
            ], 409);
        }

        $vehStmt = $pdo->prepare("SELECT daily_rate, status FROM vehicles WHERE vehicle_id = ?");
        $vehStmt->execute([$vehicleId]);
        $vehicle = $vehStmt->fetch();

        if (!$vehicle || $vehicle['status'] !== 'available') {
            sendJson(['status' => 'error', 'message' => 'Selected vehicle is currently unavailable.'], 400);
        }

        $days = max(1, ceil((strtotime($endDate) - strtotime($startDate)) / 86400));
        $dailyRate = floatval($vehicle['daily_rate']);
        $totalAmount = $dailyRate * $days;

        // Auto-assign active driver if available
        $driverStmt = $pdo->query("SELECT driver_id FROM drivers WHERE driver_status = 'active' LIMIT 1");
        $driver = $driverStmt->fetch();
        $driverId = $driver ? $driver['driver_id'] : null;

        $insertStmt = $pdo->prepare("
            INSERT INTO trips_bookings (customer_id, vehicle_id, driver_id, pickup_location_id, dropoff_location_id, start_date, end_date, daily_rate, total_amount, booking_status, special_notes)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?)
        ");
        $insertStmt->execute([$customerId, $vehicleId, $driverId, $pickupLoc, $dropoffLoc, $startDate, $endDate, $dailyRate, $totalAmount, $notes]);

        sendJson([
            'status' => 'success',
            'message' => 'Booking request submitted successfully!',
            'booking_id' => $pdo->lastInsertId(),
            'total_days' => $days,
            'total_amount' => $totalAmount
        ], 201);
    }

    if ($method === 'PUT') {
        $input = getJsonInput();
        $bookingId = $input['booking_id'] ?? null;
        $newStatus = $input['status'] ?? null;

        if (!$bookingId || !$newStatus) {
            sendJson(['status' => 'error', 'message' => 'Booking ID and new status are required.'], 400);
        }

        $validStatuses = ['pending', 'approved', 'active', 'completed', 'cancelled'];
        if (!in_array($newStatus, $validStatuses)) {
            sendJson(['status' => 'error', 'message' => 'Invalid status value.'], 400);
        }

        $stmt = $pdo->prepare("UPDATE trips_bookings SET booking_status = ? WHERE booking_id = ?");
        $stmt->execute([$newStatus, $bookingId]);

        sendJson(['status' => 'success', 'message' => "Booking status updated to '$newStatus'."]);
    }
}

// =====================================================================
// 4. PAYMENTS API
// =====================================================================
if ($endpoint === 'payments') {
    if ($method === 'GET') {
        $userId = $_GET['user_id'] ?? null;

        $query = "
            SELECT p.*, b.start_date, b.end_date, v.model_name, u.full_name AS customer_name
            FROM payments p
            JOIN trips_bookings b ON p.booking_id = b.booking_id
            JOIN vehicles v ON b.vehicle_id = v.vehicle_id
            JOIN users u ON p.customer_id = u.user_id
            WHERE 1=1
        ";

        $params = [];
        if ($userId) {
            $query .= " AND p.customer_id = ?";
            $params[] = $userId;
        }

        $query .= " ORDER BY p.payment_date DESC";
        $stmt = $pdo->prepare($query);
        $stmt->execute($params);
        $payments = $stmt->fetchAll();

        sendJson(['status' => 'success', 'data' => $payments]);
    }

    if ($method === 'POST') {
        $input = getJsonInput();
        $bookingId  = $input['booking_id'] ?? null;
        $customerId = $input['customer_id'] ?? null;
        $methodName = $input['payment_method'] ?? 'bKash';
        $txnId      = trim($input['transaction_id'] ?? '');

        if (!$bookingId || !$customerId || empty($txnId)) {
            sendJson(['status' => 'error', 'message' => 'Booking ID, Customer ID, and Transaction ID are required.'], 400);
        }

        $dupStmt = $pdo->prepare("SELECT payment_id FROM payments WHERE transaction_id = ?");
        $dupStmt->execute([$txnId]);
        if ($dupStmt->fetch()) {
            sendJson(['status' => 'error', 'message' => 'Transaction ID already used.'], 409);
        }

        $bkStmt = $pdo->prepare("SELECT total_amount FROM trips_bookings WHERE booking_id = ? AND customer_id = ?");
        $bkStmt->execute([$bookingId, $customerId]);
        $booking = $bkStmt->fetch();

        if (!$booking) {
            sendJson(['status' => 'error', 'message' => 'Booking not found.'], 404);
        }

        $amount = floatval($booking['total_amount']);

        $stmt = $pdo->prepare("
            INSERT INTO payments (booking_id, customer_id, payment_method, transaction_id, amount, payment_status)
            VALUES (?, ?, ?, ?, ?, 'pending')
        ");
        $stmt->execute([$bookingId, $customerId, $methodName, $txnId, $amount]);

        sendJson([
            'status' => 'success',
            'message' => 'Digital payment submitted for verification.',
            'payment_id' => $pdo->lastInsertId(),
            'amount' => $amount,
            'transaction_id' => $txnId
        ], 201);
    }

    if ($method === 'PUT') {
        $input = getJsonInput();
        $paymentId = $input['payment_id'] ?? null;
        $status    = $input['status'] ?? 'approved';

        if (!$paymentId) {
            sendJson(['status' => 'error', 'message' => 'Payment ID is required.'], 400);
        }

        $stmt = $pdo->prepare("UPDATE payments SET payment_status = ? WHERE payment_id = ?");
        $stmt->execute([$status, $paymentId]);

        if ($status === 'approved') {
            $pStmt = $pdo->prepare("SELECT booking_id FROM payments WHERE payment_id = ?");
            $pStmt->execute([$paymentId]);
            $pay = $pStmt->fetch();
            if ($pay) {
                $pdo->prepare("UPDATE trips_bookings SET booking_status = 'approved' WHERE booking_id = ?")->execute([$pay['booking_id']]);
            }
        }

        sendJson(['status' => 'success', 'message' => "Payment marked as $status."]);
    }
}

// =====================================================================
// 5. REVIEWS API
// =====================================================================
if ($endpoint === 'reviews') {
    if ($method === 'GET') {
        $vehicleId = $_GET['vehicle_id'] ?? null;
        $driverId  = $_GET['driver_id'] ?? null;

        $query = "
            SELECT r.*, 
                   u.full_name AS customer_name,
                   v.model_name AS vehicle_name,
                   u_dr.full_name AS driver_name
            FROM reviews r
            JOIN users u ON r.customer_id = u.user_id
            JOIN vehicles v ON r.vehicle_id = v.vehicle_id
            LEFT JOIN drivers d ON r.driver_id = d.driver_id
            LEFT JOIN users u_dr ON d.user_id = u_dr.user_id
            WHERE 1=1
        ";

        $params = [];
        if ($vehicleId) {
            $query .= " AND r.vehicle_id = ?";
            $params[] = $vehicleId;
        }
        if ($driverId) {
            $query .= " AND r.driver_id = ?";
            $params[] = $driverId;
        }

        $query .= " ORDER BY r.created_at DESC";
        $stmt = $pdo->prepare($query);
        $stmt->execute($params);
        $reviews = $stmt->fetchAll();

        sendJson(['status' => 'success', 'data' => $reviews]);
    }

    if ($method === 'POST') {
        $input = getJsonInput();
        $bookingId     = $input['booking_id'] ?? null;
        $customerId    = $input['customer_id'] ?? null;
        $vehicleRating = intval($input['vehicle_rating'] ?? 5);
        $vehicleComment= trim($input['vehicle_comment'] ?? '');
        $driverRating  = isset($input['driver_rating']) ? intval($input['driver_rating']) : null;
        $driverComment = trim($input['driver_comment'] ?? '');

        if (!$bookingId || !$customerId) {
            sendJson(['status' => 'error', 'message' => 'Booking ID and Customer ID are required.'], 400);
        }

        $bkStmt = $pdo->prepare("SELECT vehicle_id, driver_id FROM trips_bookings WHERE booking_id = ? AND customer_id = ?");
        $bkStmt->execute([$bookingId, $customerId]);
        $booking = $bkStmt->fetch();

        if (!$booking) {
            sendJson(['status' => 'error', 'message' => 'Booking not found or unauthorized.'], 404);
        }

        $chkStmt = $pdo->prepare("SELECT review_id FROM reviews WHERE booking_id = ?");
        $chkStmt->execute([$bookingId]);
        if ($chkStmt->fetch()) {
            sendJson(['status' => 'error', 'message' => 'Review already submitted for this booking.'], 409);
        }

        $insertStmt = $pdo->prepare("
            INSERT INTO reviews (booking_id, customer_id, vehicle_id, driver_id, vehicle_rating, vehicle_comment, driver_rating, driver_comment)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ");
        $insertStmt->execute([
            $bookingId,
            $customerId,
            $booking['vehicle_id'],
            $booking['driver_id'],
            $vehicleRating,
            $vehicleComment,
            $driverRating,
            $driverComment
        ]);

        sendJson(['status' => 'success', 'message' => 'Thank you! Your reviews for vehicle and driver have been posted.']);
    }
}

// =====================================================================
// 6. TRIPS API
// =====================================================================
if ($endpoint === 'trips') {
    if ($method === 'GET') {
        $driverId = $_GET['driver_id'] ?? null;
        if (!$driverId) {
            sendJson(['status' => 'error', 'message' => 'Driver ID is required.'], 400);
        }

        $stmt = $pdo->prepare("
            SELECT b.*, v.model_name, v.registration_no, v.image_icon,
                   u_cust.full_name AS customer_name, u_cust.phone AS customer_phone,
                   l_pick.hub_name AS pickup_hub, l_drop.hub_name AS dropoff_hub
            FROM trips_bookings b
            JOIN vehicles v ON b.vehicle_id = v.vehicle_id
            JOIN users u_cust ON b.customer_id = u_cust.user_id
            JOIN locations l_pick ON b.pickup_location_id = l_pick.location_id
            JOIN locations l_drop ON b.dropoff_location_id = l_drop.location_id
            WHERE b.driver_id = ?
            ORDER BY b.start_date ASC
        ");
        $stmt->execute([$driverId]);
        $trips = $stmt->fetchAll();

        sendJson(['status' => 'success', 'data' => $trips]);
    }

    if ($method === 'POST') {
        $input = getJsonInput();
        $bookingId = $input['booking_id'] ?? null;
        $action = $input['action'] ?? 'start_trip';

        if (!$bookingId) {
            sendJson(['status' => 'error', 'message' => 'Booking ID is required.'], 400);
        }

        if ($action === 'start_trip') {
            $odoStart = intval($input['odometer_start'] ?? 0);
            $stmt = $pdo->prepare("UPDATE trips_bookings SET booking_status = 'active', trip_odometer_start = ? WHERE booking_id = ?");
            $stmt->execute([$odoStart, $bookingId]);
            sendJson(['status' => 'success', 'message' => 'Trip started successfully!']);
        }

        if ($action === 'complete_trip') {
            $odoEnd = intval($input['odometer_end'] ?? 0);
            $stmt = $pdo->prepare("UPDATE trips_bookings SET booking_status = 'completed', trip_odometer_end = ? WHERE booking_id = ?");
            $stmt->execute([$odoEnd, $bookingId]);
            sendJson(['status' => 'success', 'message' => 'Trip marked as completed!']);
        }

        sendJson(['status' => 'error', 'message' => 'Invalid action.'], 400);
    }
}

// =====================================================================
// 7. FUEL API
// =====================================================================
if ($endpoint === 'fuel') {
    if ($method === 'GET') {
        $vehicleId = $_GET['vehicle_id'] ?? null;
        $driverId  = $_GET['driver_id'] ?? null;

        $query = "
            SELECT fl.*, v.model_name, v.registration_no, u.full_name AS driver_name
            FROM fuel_logs fl
            JOIN vehicles v ON fl.vehicle_id = v.vehicle_id
            JOIN drivers d ON fl.driver_id = d.driver_id
            JOIN users u ON d.user_id = u.user_id
            WHERE 1=1
        ";

        $params = [];
        if ($vehicleId) {
            $query .= " AND fl.vehicle_id = ?";
            $params[] = $vehicleId;
        }
        if ($driverId) {
            $query .= " AND fl.driver_id = ?";
            $params[] = $driverId;
        }

        $query .= " ORDER BY fl.log_date DESC, fl.created_at DESC";
        $stmt = $pdo->prepare($query);
        $stmt->execute($params);
        $logs = $stmt->fetchAll();

        sendJson(['status' => 'success', 'data' => $logs]);
    }

    if ($method === 'POST') {
        $input = getJsonInput();
        $vehicleId = $input['vehicle_id'] ?? null;
        $driverId  = $input['driver_id'] ?? null;
        $bookingId = $input['booking_id'] ?? null;
        $logDate   = $input['log_date'] ?? date('Y-m-d');
        $odometer  = intval($input['odometer_reading'] ?? 0);
        $liters    = floatval($input['fuel_liters'] ?? 0);
        $totalCost = floatval($input['total_cost'] ?? 0);
        $station   = trim($input['fuel_station'] ?? '');
        $notes     = trim($input['notes'] ?? '');

        if (!$vehicleId || !$driverId || $liters <= 0 || $totalCost <= 0) {
            sendJson(['status' => 'error', 'message' => 'Vehicle, Driver, Fuel Liters, and Total Cost are required.'], 400);
        }

        $stmt = $pdo->prepare("
            INSERT INTO fuel_logs (vehicle_id, driver_id, booking_id, log_date, odometer_reading, fuel_liters, total_cost, fuel_station, notes)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ");
        $stmt->execute([$vehicleId, $driverId, $bookingId, $logDate, $odometer, $liters, $totalCost, $station, $notes]);

        sendJson(['status' => 'success', 'message' => 'Fuel usage record saved successfully!', 'id' => $pdo->lastInsertId()], 201);
    }
}

// =====================================================================
// 8. MAINTENANCE API
// =====================================================================
if ($endpoint === 'maintenance') {
    if ($method === 'GET') {
        $vehicleId = $_GET['vehicle_id'] ?? null;
        $status    = $_GET['status'] ?? null;

        $query = "
            SELECT m.*, v.model_name, v.registration_no, v.image_icon, u.full_name AS reported_by_name
            FROM maintenance_reports m
            JOIN vehicles v ON m.vehicle_id = v.vehicle_id
            JOIN users u ON m.reported_by = u.user_id
            WHERE 1=1
        ";

        $params = [];
        if ($vehicleId) {
            $query .= " AND m.vehicle_id = ?";
            $params[] = $vehicleId;
        }
        if ($status && $status !== 'all') {
            $query .= " AND m.status = ?";
            $params[] = $status;
        }

        $query .= " ORDER BY m.reported_at DESC";
        $stmt = $pdo->prepare($query);
        $stmt->execute($params);
        $reports = $stmt->fetchAll();

        sendJson(['status' => 'success', 'data' => $reports]);
    }

    if ($method === 'POST') {
        $input = getJsonInput();
        $vehicleId   = $input['vehicle_id'] ?? null;
        $reportedBy  = $input['reported_by'] ?? null;
        $issueType   = $input['issue_type'] ?? 'Other';
        $severity    = $input['severity'] ?? 'medium';
        $description = trim($input['description'] ?? '');

        if (!$vehicleId || !$reportedBy || empty($description)) {
            sendJson(['status' => 'error', 'message' => 'Vehicle, Reporter ID, and Description are required.'], 400);
        }

        $stmt = $pdo->prepare("
            INSERT INTO maintenance_reports (vehicle_id, reported_by, issue_type, severity, description, status)
            VALUES (?, ?, ?, ?, ?, 'reported')
        ");
        $stmt->execute([$vehicleId, $reportedBy, $issueType, $severity, $description]);

        if ($severity === 'critical' || $severity === 'high') {
            $pdo->prepare("UPDATE vehicles SET status = 'maintenance' WHERE vehicle_id = ?")->execute([$vehicleId]);
        }

        sendJson(['status' => 'success', 'message' => 'Vehicle problem report submitted.', 'id' => $pdo->lastInsertId()], 201);
    }

    if ($method === 'PUT') {
        $input = getJsonInput();
        $reportId   = $input['report_id'] ?? null;
        $newStatus  = $input['status'] ?? 'under_review';
        $repairCost = floatval($input['repair_cost'] ?? 0.00);

        if (!$reportId) {
            sendJson(['status' => 'error', 'message' => 'Report ID is required.'], 400);
        }

        $resolvedAt = ($newStatus === 'resolved') ? date('Y-m-d H:i:s') : null;

        $stmt = $pdo->prepare("
            UPDATE maintenance_reports 
            SET status = ?, repair_cost = ?, resolved_at = ?
            WHERE report_id = ?
        ");
        $stmt->execute([$newStatus, $repairCost, $resolvedAt, $reportId]);

        if ($newStatus === 'resolved') {
            $vStmt = $pdo->prepare("SELECT vehicle_id FROM maintenance_reports WHERE report_id = ?");
            $vStmt->execute([$reportId]);
            $veh = $vStmt->fetch();
            if ($veh) {
                $pdo->prepare("UPDATE vehicles SET status = 'available' WHERE vehicle_id = ? AND status = 'maintenance'")->execute([$veh['vehicle_id']]);
            }
        }

        sendJson(['status' => 'success', 'message' => 'Maintenance record updated.']);
    }
}

// =====================================================================
// 9. COMPLAINTS API
// =====================================================================
if ($endpoint === 'complaints') {
    if ($method === 'GET') {
        $userId = $_GET['user_id'] ?? null;
        $role   = $_GET['role'] ?? null;
        $status = $_GET['status'] ?? null;

        $query = "
            SELECT c.*, u.full_name AS reporter_name, u.email AS reporter_email, u.phone AS reporter_phone
            FROM complaints c
            JOIN users u ON c.user_id = u.user_id
            WHERE 1=1
        ";

        $params = [];
        if ($userId) {
            $query .= " AND c.user_id = ?";
            $params[] = $userId;
        }
        if ($role && $role !== 'all') {
            $query .= " AND c.role_type = ?";
            $params[] = $role;
        }
        if ($status && $status !== 'all') {
            $query .= " AND c.status = ?";
            $params[] = $status;
        }

        $query .= " ORDER BY c.created_at DESC";
        $stmt = $pdo->prepare($query);
        $stmt->execute($params);
        $complaints = $stmt->fetchAll();

        sendJson(['status' => 'success', 'data' => $complaints]);
    }

    if ($method === 'POST') {
        $input = getJsonInput();
        $userId      = $input['user_id'] ?? null;
        $roleType    = $input['role_type'] ?? 'customer';
        $bookingId   = !empty($input['booking_id']) ? intval($input['booking_id']) : null;
        $subject     = trim($input['subject'] ?? '');
        $description = trim($input['description'] ?? '');

        if (!$userId || empty($subject) || empty($description)) {
            sendJson(['status' => 'error', 'message' => 'User ID, subject, and description are required.'], 400);
        }

        $stmt = $pdo->prepare("
            INSERT INTO complaints (user_id, role_type, booking_id, subject, description, status)
            VALUES (?, ?, ?, ?, ?, 'open')
        ");
        $stmt->execute([$userId, $roleType, $bookingId, $subject, $description]);

        sendJson([
            'status' => 'success',
            'message' => 'Support ticket submitted successfully.',
            'complaint_id' => $pdo->lastInsertId()
        ], 201);
    }

    if ($method === 'PUT') {
        $input = getJsonInput();
        $complaintId = $input['complaint_id'] ?? null;
        $status      = $input['status'] ?? 'resolved';
        $resolution  = trim($input['admin_resolution'] ?? '');

        if (!$complaintId) {
            sendJson(['status' => 'error', 'message' => 'Complaint ID is required.'], 400);
        }

        $resolvedAt = in_array($status, ['resolved', 'dismissed']) ? date('Y-m-d H:i:s') : null;

        $stmt = $pdo->prepare("
            UPDATE complaints
            SET status = ?, admin_resolution = ?, resolved_at = ?
            WHERE complaint_id = ?
        ");
        $stmt->execute([$status, $resolution, $resolvedAt, $complaintId]);

        sendJson(['status' => 'success', 'message' => 'Complaint updated successfully.']);
    }
}

// =====================================================================
// 10. DRIVER LEAVES API
// =====================================================================
if ($endpoint === 'leaves') {
    if ($method === 'GET') {
        $driverId = $_GET['driver_id'] ?? null;
        $status   = $_GET['status'] ?? null;

        $query = "
            SELECT l.*, u.full_name AS driver_name, u.phone AS driver_phone, d.license_number
            FROM driver_leaves l
            JOIN drivers d ON l.driver_id = d.driver_id
            JOIN users u ON d.user_id = u.user_id
            WHERE 1=1
        ";

        $params = [];
        if ($driverId) {
            $query .= " AND l.driver_id = ?";
            $params[] = $driverId;
        }
        if ($status && $status !== 'all') {
            $query .= " AND l.status = ?";
            $params[] = $status;
        }

        $query .= " ORDER BY l.created_at DESC";
        $stmt = $pdo->prepare($query);
        $stmt->execute($params);
        $leaves = $stmt->fetchAll();

        sendJson(['status' => 'success', 'data' => $leaves]);
    }

    if ($method === 'POST') {
        $input = getJsonInput();
        $driverId  = $input['driver_id'] ?? null;
        $startDate = $input['start_date'] ?? null;
        $endDate   = $input['end_date'] ?? null;
        $reason    = trim($input['reason'] ?? '');

        if (!$driverId || !$startDate || !$endDate || empty($reason)) {
            sendJson(['status' => 'error', 'message' => 'Driver ID, start date, end date, and reason are required.'], 400);
        }

        if (strtotime($endDate) < strtotime($startDate)) {
            sendJson(['status' => 'error', 'message' => 'End date cannot be earlier than start date.'], 400);
        }

        $stmt = $pdo->prepare("
            INSERT INTO driver_leaves (driver_id, start_date, end_date, reason, status)
            VALUES (?, ?, ?, ?, 'pending')
        ");
        $stmt->execute([$driverId, $startDate, $endDate, $reason]);

        sendJson([
            'status' => 'success',
            'message' => 'Leave application submitted.',
            'leave_id' => $pdo->lastInsertId()
        ], 201);
    }

    if ($method === 'PUT') {
        $input = getJsonInput();
        $leaveId = $input['leave_id'] ?? null;
        $status  = $input['status'] ?? 'approved';
        $remarks = trim($input['admin_remarks'] ?? '');

        if (!$leaveId) {
            sendJson(['status' => 'error', 'message' => 'Leave ID is required.'], 400);
        }

        $stmt = $pdo->prepare("UPDATE driver_leaves SET status = ?, admin_remarks = ? WHERE leave_id = ?");
        $stmt->execute([$status, $remarks, $leaveId]);

        if ($status === 'approved') {
            $lStmt = $pdo->prepare("SELECT driver_id, start_date, end_date FROM driver_leaves WHERE leave_id = ?");
            $lStmt->execute([$leaveId]);
            $leave = $lStmt->fetch();
            if ($leave && date('Y-m-d') >= $leave['start_date'] && date('Y-m-d') <= $leave['end_date']) {
                $pdo->prepare("UPDATE drivers SET driver_status = 'on_leave' WHERE driver_id = ?")->execute([$leave['driver_id']]);
            }
        }

        sendJson(['status' => 'success', 'message' => 'Leave request updated successfully.']);
    }
}

// =====================================================================
// 11. DOCUMENTS API
// =====================================================================
if ($endpoint === 'documents') {
    if ($method === 'GET') {
        $vehicleId = $_GET['vehicle_id'] ?? null;
        $ownerId   = $_GET['owner_id'] ?? null;

        $query = "
            SELECT vd.*, v.model_name, v.registration_no, v.owner_id,
                   DATEDIFF(vd.expiry_date, CURRENT_DATE) AS days_until_expiry
            FROM vehicle_documents vd
            JOIN vehicles v ON vd.vehicle_id = v.vehicle_id
            WHERE 1=1
        ";

        $params = [];
        if ($vehicleId) {
            $query .= " AND vd.vehicle_id = ?";
            $params[] = $vehicleId;
        }
        if ($ownerId) {
            $query .= " AND v.owner_id = ?";
            $params[] = $ownerId;
        }

        $query .= " ORDER BY vd.expiry_date ASC";
        $stmt = $pdo->prepare($query);
        $stmt->execute($params);
        $docs = $stmt->fetchAll();

        sendJson(['status' => 'success', 'data' => $docs]);
    }

    if ($method === 'POST') {
        $input = getJsonInput();
        $vehicleId  = $input['vehicle_id'] ?? null;
        $docType    = $input['doc_type'] ?? null;
        $docNumber  = trim($input['doc_number'] ?? '');
        $expiryDate = $input['expiry_date'] ?? null;
        $fileUrl    = trim($input['file_url'] ?? '');

        if (!$vehicleId || !$docType || empty($docNumber) || !$expiryDate) {
            sendJson(['status' => 'error', 'message' => 'Vehicle, document type, document number, and expiry date are required.'], 400);
        }

        $stmt = $pdo->prepare("
            INSERT INTO vehicle_documents (vehicle_id, doc_type, doc_number, expiry_date, verification_status, file_url)
            VALUES (?, ?, ?, ?, 'pending', ?)
        ");
        $stmt->execute([$vehicleId, $docType, $docNumber, $expiryDate, $fileUrl]);

        sendJson([
            'status' => 'success',
            'message' => 'Vehicle document uploaded for verification.',
            'doc_id' => $pdo->lastInsertId()
        ], 201);
    }

    if ($method === 'PUT') {
        $input = getJsonInput();
        $docId  = $input['doc_id'] ?? null;
        $status = $input['status'] ?? 'verified';

        if (!$docId) {
            sendJson(['status' => 'error', 'message' => 'Document ID is required.'], 400);
        }

        $stmt = $pdo->prepare("UPDATE vehicle_documents SET verification_status = ? WHERE doc_id = ?");
        $stmt->execute([$status, $docId]);

        sendJson(['status' => 'success', 'message' => 'Vehicle document verification status updated.']);
    }
}

// =====================================================================
// 12. ANNOUNCEMENTS API
// =====================================================================
if ($endpoint === 'announcements') {
    if ($method === 'GET') {
        $role = $_GET['role'] ?? 'all';

        $query = "
            SELECT * FROM announcements
            WHERE target_role = 'all' OR target_role = ?
            ORDER BY created_at DESC
        ";

        $stmt = $pdo->prepare($query);
        $stmt->execute([$role]);
        $announcements = $stmt->fetchAll();

        sendJson(['status' => 'success', 'data' => $announcements]);
    }

    if ($method === 'POST') {
        $input = getJsonInput();
        $targetRole = $input['target_role'] ?? 'all';
        $title      = trim($input['title'] ?? '');
        $message    = trim($input['message'] ?? '');
        $category   = $input['category'] ?? 'General';

        if (empty($title) || empty($message)) {
            sendJson(['status' => 'error', 'message' => 'Title and message are required.'], 400);
        }

        $stmt = $pdo->prepare("
            INSERT INTO announcements (target_role, title, message, category)
            VALUES (?, ?, ?, ?)
        ");
        $stmt->execute([$targetRole, $title, $message, $category]);

        sendJson([
            'status' => 'success',
            'message' => 'Announcement broadcasted successfully.',
            'announcement_id' => $pdo->lastInsertId()
        ], 201);
    }
}

// ---------------------------------------------------------------------
// UNKNOWN ENDPOINT
// ---------------------------------------------------------------------
sendJson(['status' => 'error', 'message' => "Endpoint '$endpoint' not found or unsupported."], 404);
