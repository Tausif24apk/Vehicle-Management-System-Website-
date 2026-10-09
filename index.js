// =====================================================================
// DATA & STATE STORE (3NF ALIGNED IN-BROWSER PERSISTENCE)
// =====================================================================

// Password hashing helper (SHA-256 with salt)
async function hashPassword(plain) {
  const encoder = new TextEncoder();
  const data = encoder.encode(plain + 'vhub_salt_2025');
  const hashBuf = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hashBuf)).map(b=>b.toString(16).padStart(2,'0')).join('');
}

var db = JSON.parse(localStorage.getItem('vrms_db') || '{}');

// Locations / Hubs
if (!db.locations) {
  db.locations = [
    { id: 1, name: 'Dhaka - Banani Hub', city: 'Dhaka', address: 'Road 11, Block D, Banani' },
    { id: 2, name: 'Dhaka - Dhanmondi Hub', city: 'Dhaka', address: 'Satmasjid Road, Dhanmondi 27' },
    { id: 3, name: 'Dhaka - Uttara Terminal', city: 'Dhaka', address: 'Sector 3, Jashimuddin Ave' },
    { id: 4, name: 'Chittagong - GEC Branch', city: 'Chittagong', address: 'GEC Circle, Nasirabad' },
    { id: 5, name: 'Sylhet - Zindabazar Hub', city: 'Sylhet', address: 'Zindabazar Point' },
    { id: 6, name: "Cox's Bazar - Kolatoli Point", city: "Cox's Bazar", address: 'Marine Drive Road' }
  ];
}

// Initial vehicles with locations and specs (System fleet, available for all customers)
if (!db.vehicles) {
  db.vehicles = [
    { id: 1, name: 'Toyota Corolla Altis 2022', type: 'Sedan', locationId: 1, location: 'Dhaka - Banani Hub', price: 3500, status: 'available', owner: null, img: '🚘', seats: 5, fuel: 'Octane', regNo: 'DHK-MET-GA-11-2022' },
    { id: 2, name: 'Hyundai Tucson AWD', type: 'SUV', locationId: 2, location: 'Dhaka - Dhanmondi Hub', price: 5500, status: 'available', owner: null, img: '🚙', seats: 7, fuel: 'Diesel', regNo: 'DHK-MET-GHA-22-3033' },
    { id: 3, name: 'Toyota Hiace Grand Cabin', type: 'Van', locationId: 3, location: 'Dhaka - Uttara Terminal', price: 6500, status: 'available', owner: null, img: '🚐', seats: 14, fuel: 'Octane', regNo: 'DHK-MET-CHA-33-4044' },
    { id: 4, name: 'Mitsubishi Rosa Luxury Bus', type: 'Minibus', locationId: 4, location: 'Chittagong - GEC Branch', price: 8000, status: 'available', owner: null, img: '🚌', seats: 26, fuel: 'Diesel', regNo: 'CTG-MET-BA-44-5055' },
    { id: 5, name: 'Honda CB 150R Streetfire', type: 'Motorcycle', locationId: 1, location: 'Dhaka - Banani Hub', price: 1200, status: 'available', owner: null, img: '🏍️', seats: 2, fuel: 'Octane', regNo: 'DHK-MET-HA-55-6066' },
    { id: 6, name: 'Toyota Land Cruiser Prado', type: 'SUV', locationId: 5, location: 'Sylhet - Zindabazar Hub', price: 11000, status: 'available', owner: null, img: '🚙', seats: 7, fuel: 'Diesel', regNo: 'SYL-MET-GHA-66-7077' }
  ];
}

if (!db.users) db.users = [];
if (!db.drivers) db.drivers = [];
if (!db.bookings) db.bookings = [];
if (!db.payments) db.payments = [];
if (!db.reviews) db.reviews = [];
if (!db.fuel_logs) db.fuel_logs = [];
if (!db.maintenance_reports) db.maintenance_reports = [];
if (!db.notifications) db.notifications = [];
if (!db.favorites) db.favorites = [];
if (!db.complaints) db.complaints = [];
if (!db.leaves) db.leaves = [];
if (!db.documents) {
  db.documents = [
    { id: 1, vehicleId: 1, vehicleName: 'Toyota Corolla Altis 2022', docType: 'Registration Certificate', docNumber: 'BRTA-REG-GA-11-2022', expiryDate: '2028-12-31', status: 'verified' },
    { id: 2, vehicleId: 1, vehicleName: 'Toyota Corolla Altis 2022', docType: 'Insurance Policy', docNumber: 'INS-GREEN-99210-26', expiryDate: '2027-04-15', status: 'verified' },
    { id: 3, vehicleId: 1, vehicleName: 'Toyota Corolla Altis 2022', docType: 'Tax Token', docNumber: 'TT-2026-88129', expiryDate: '2026-11-30', status: 'verified' },
    { id: 4, vehicleId: 1, vehicleName: 'Toyota Corolla Altis 2022', docType: 'Fitness Certificate', docNumber: 'FIT-DHK-44120', expiryDate: '2027-02-28', status: 'verified' },
    { id: 5, vehicleId: 2, vehicleName: 'Hyundai Tucson AWD', docType: 'Insurance Policy', docNumber: 'INS-DELTA-33100-26', expiryDate: '2026-10-15', status: 'verified' }
  ];
}
// Clear and purge any broadcast announcements history
if (db.announcements) {
  delete db.announcements;
}
db.announcements = [];
// Clear and purge any audit logs history
if (db.audit_logs) {
  delete db.audit_logs;
}
db.audit_logs = [];
save();

function logAudit(action, entity, details) {
  // Audit & security logging disabled per specification
}

function save() {
  localStorage.setItem('vrms_db', JSON.stringify(db));
}

let _idCounter = 0;
function genId() {
  return parseInt(Date.now().toString() + (++_idCounter % 1000).toString().padStart(3, '0'));
}

// Purge any old demo accounts and enforce ONLY the primary administrator exists
const PRIMARY_ADMIN_EMAIL = '2023100000502@seu.edu.bd';
const PRIMARY_ADMIN_HASH = 'a2b913def6a978a862231a3ed8a849f015cbdd41d89c111a40922bc5884e1f0e'; // @Sadia2026

function purgeOldDemoAccounts() {
  const oldEmails = ['admin@vhub.com', 'owner@vhub.com', 'driver@vhub.com', 'user@vhub.com', 'kamal.driver@vhub.com'];
  if (db.users && db.users.length) {
    // Remove old demo accounts AND ANY OTHER ADMIN except PRIMARY_ADMIN_EMAIL
    const purgeIds = db.users.filter(u => {
      const email = (u.email || '').toLowerCase();
      if (oldEmails.includes(email)) return true;
      if (u.role === 'admin' && email !== PRIMARY_ADMIN_EMAIL.toLowerCase()) return true;
      return false;
    }).map(u => u.id);

    db.users = db.users.filter(u => {
      const email = (u.email || '').toLowerCase();
      if (oldEmails.includes(email)) return false;
      if (u.role === 'admin' && email !== PRIMARY_ADMIN_EMAIL.toLowerCase()) return false;
      return true;
    });

    if (purgeIds.length > 0) {
      db.drivers = (db.drivers || []).filter(d => !purgeIds.includes(d.userId));
      db.bookings = (db.bookings || []).filter(b => !purgeIds.includes(b.userId));
      db.payments = (db.payments || []).filter(p => !purgeIds.includes(p.userId));
      db.reviews = (db.reviews || []).filter(r => !purgeIds.includes(r.userId));
      db.fuel_logs = (db.fuel_logs || []).filter(f => !purgeIds.includes(f.driverId));
      db.maintenance_reports = (db.maintenance_reports || []).filter(m => !purgeIds.includes(m.reportedBy));
    }
  }
  if (db.vehicles && db.vehicles.length) {
    db.vehicles.forEach(v => {
      if (v.owner === 2) v.owner = null;
    });
  }
  // Clear any existing active session if logged in as an unauthorized user
  try {
    const saved = sessionStorage.getItem('vrms_user');
    if (saved) {
      const parsed = JSON.parse(saved);
      const email = (parsed.email || '').toLowerCase();
      if (oldEmails.includes(email) || (parsed.role === 'admin' && email !== PRIMARY_ADMIN_EMAIL.toLowerCase())) {
        currentUser = null;
        sessionStorage.removeItem('vrms_user');
      }
    }
  } catch(e) {}
  save();
}
purgeOldDemoAccounts();

// Ensure Primary System Administrator is the SOLE administrator
let primaryAdmin = db.users.find(u => u.email.toLowerCase() === PRIMARY_ADMIN_EMAIL.toLowerCase());
if (!primaryAdmin) {
  primaryAdmin = {
    id: 1,
    name: 'Sadia Rahman (System Admin)',
    email: PRIMARY_ADMIN_EMAIL,
    phone: '01700000502',
    pass: PRIMARY_ADMIN_HASH,
    role: 'admin',
    createdAt: new Date().toISOString()
  };
  db.users.push(primaryAdmin);
} else {
  primaryAdmin.role = 'admin';
  primaryAdmin.pass = PRIMARY_ADMIN_HASH;
}

// Strictly remove any other administrator from db.users
db.users = db.users.filter(u => u.role !== 'admin' || u.email.toLowerCase() === PRIMARY_ADMIN_EMAIL.toLowerCase());
save();

// Active user session
var currentUser = null;
var selectedRole = 'user';

try {
  const savedSession = sessionStorage.getItem('vrms_user');
  if (savedSession) {
    const parsed = JSON.parse(savedSession);
    const fresh = db.users.find(u => u.id === parsed.id);
    if (fresh) { currentUser = fresh; }
  }
} catch(e) { currentUser = null; }

// =====================================================================
// FEATURE 3: NEXT UNAVAILABLE SLOT CALCULATION & OVERLAP CHECK
// =====================================================================

function getNextUnavailableSlot(vehicleId) {
  const todayStr = new Date().toISOString().split('T')[0];
  // Find all active/pending/approved bookings ending on or after today
  const upcoming = db.bookings
    .filter(b => b.vehicleId === vehicleId && (b.status === 'approved' || b.status === 'active' || b.status === 'pending') && b.to >= todayStr)
    .sort((a, b) => a.from.localeCompare(b.from));

  if (!upcoming.length) return null;

  // Check if currently on trip
  const activeNow = upcoming.find(b => b.from <= todayStr && b.to >= todayStr);
  if (activeNow) {
    return { type: 'current', from: activeNow.from, to: activeNow.to, booking: activeNow };
  }
  // Otherwise the earliest upcoming slot
  return { type: 'future', from: upcoming[0].from, to: upcoming[0].to, booking: upcoming[0] };
}

function checkBookingOverlap(vehicleId, fromDate, toDate, excludeBookingId = null) {
  return db.bookings.find(b => 
    b.vehicleId === vehicleId && 
    (b.status === 'approved' || b.status === 'active' || b.status === 'pending') &&
    b.id !== excludeBookingId &&
    (fromDate < b.to && toDate > b.from)
  );
}

// =====================================================================
// FEATURE 1: DRIVER + VEHICLE REVIEW CALCULATIONS
// =====================================================================

function getVehicleReviews(vehicleId) {
  return db.reviews.filter(r => r.vehicleId === vehicleId);
}

function getVehicleAvgRating(vehicleId) {
  const revs = getVehicleReviews(vehicleId);
  if (!revs.length) return 5.0;
  const sum = revs.reduce((acc, r) => acc + Number(r.vehicleRating), 0);
  return (sum / revs.length).toFixed(1);
}

function getDriverReviews(driverId) {
  return db.reviews.filter(r => r.driverId === driverId && r.driverRating);
}

function getDriverAvgRating(driverId) {
  const revs = getDriverReviews(driverId);
  if (!revs.length) return 5.0;
  const sum = revs.reduce((acc, r) => acc + Number(r.driverRating), 0);
  return (sum / revs.length).toFixed(1);
}

// =====================================================================
// NAVIGATION & VIEW SWITCHER
// =====================================================================

function showView(v, tab, role) {
  document.querySelectorAll('.view').forEach(el => el.classList.remove('active'));
  document.getElementById(v).classList.add('active');
  document.querySelector('nav').style.display = (v === 'auth') ? 'none' : '';
  if (v === 'auth') {
    if (role) selRole(role);
    if (tab) switchTab(tab, !!role);
  }
  updateNav();
}

function updateNav() {
  const na = document.getElementById('navActions');
  if (currentUser) {
    na.innerHTML = `<span style="color:var(--muted);font-size:.85rem;">Hi, <strong>${currentUser.name.split(' ')[0]}</strong> (${currentUser.role.toUpperCase()})</span>
    <button class="btn btn-ghost btn-sm" onclick="logout()">Log Out</button>`;
  } else {
    na.innerHTML = `<button class="btn btn-ghost" onclick="showView('auth','login')">Sign In</button>
    <button class="btn btn-outline btn-sm" onclick="openAdminLogin()" style="border-color:var(--accent3);color:var(--accent3);font-weight:600;">🛡️ Admin Login</button>
    <button class="btn btn-accent" onclick="showView('auth','register')">Get Started</button>`;
  }
}

// =====================================================================
// AUTH & REGISTRATION
// =====================================================================

function selLoginRole(r) {
  ['user', 'driver', 'owner', 'admin'].forEach(x => {
    const el = document.getElementById('lro_' + x);
    if (el) el.className = 'role-opt' + (r === x ? ' sel ' + r : '');
  });
  const emailInput = document.getElementById('loginEmail');
  const title = document.getElementById('authTitle');
  const sub = document.getElementById('authSub');

  if (title) title.textContent = 'Welcome back';
  if (sub) sub.textContent = 'Sign in to your account';
  if (emailInput) {
    if (emailInput.value === '2023100000502@seu.edu.bd') {
      emailInput.value = '';
    }
    emailInput.focus();
  }
}

function openAdminLogin() {
  showView('auth', 'login');
  selLoginRole('admin');
}

function switchTab(t, keepRole) {
  document.getElementById('loginForm').style.display = t === 'login' ? 'block' : 'none';
  document.getElementById('registerForm').style.display = t === 'register' ? 'block' : 'none';
  document.getElementById('tabLogin').className = 'tab' + (t === 'login' ? ' active' : '');
  document.getElementById('tabReg').className = 'tab' + (t === 'register' ? ' active' : '');
  document.getElementById('authTitle').textContent = t === 'login' ? 'Welcome back' : 'Create an account';
  document.getElementById('authSub').textContent = t === 'login' ? 'Sign in to access your portal' : 'Fill details to register';
  document.getElementById('loginMsg').className = 'msg';
  document.getElementById('regMsg').className = 'msg';
  if (!keepRole) {
    selRole('user');
    selLoginRole('user');
  }
}

function selRole(r) {
  if (r === 'admin') r = 'user'; // Administrator registration strictly forbidden
  selectedRole = r;
  ['user', 'driver', 'owner'].forEach(x => {
    const el = document.getElementById('ro_' + x);
    if (el) el.className = 'role-opt' + (r === x ? ' sel ' + r : '');
  });
  const drFields = document.getElementById('driverExtraFields');
  if (drFields) drFields.style.display = (r === 'driver') ? 'block' : 'none';
}

async function doLogin() {
  const email = document.getElementById('loginEmail').value.trim().toLowerCase();
  const pass = document.getElementById('loginPass').value;
  const msg = document.getElementById('loginMsg');
  msg.className = 'msg';

  if (!email || !pass) {
    msg.className = 'msg error';
    msg.textContent = 'Please enter both email and password.';
    return;
  }

  const hashed = await hashPassword(pass);
  const user = db.users.find(u => u.email.toLowerCase() === email && u.pass === hashed);

  if (!user) {
    logAudit('LOGIN_FAILED', 'Auth', 'Failed login attempt for: ' + email);
    msg.className = 'msg error';
    msg.textContent = 'Invalid email or password. Please check your credentials or register an account.';
    return;
  }

  currentUser = user;
  sessionStorage.setItem('vrms_user', JSON.stringify(currentUser));
  logAudit('LOGIN_SUCCESS', 'Auth', 'User ' + user.name + ' (' + user.role.toUpperCase() + ') authenticated successfully');
  loadDashboard();
}

async function doRegister() {
  const name = document.getElementById('regName').value.trim();
  const email = document.getElementById('regEmail').value.trim().toLowerCase();
  const phone = document.getElementById('regPhone').value.trim();
  const pass = document.getElementById('regPass').value;
  const passConfirm = document.getElementById('regPassConfirm').value;
  const msg = document.getElementById('regMsg');
  msg.className = 'msg';

  if (!name || !email || !phone || !pass) {
    msg.className = 'msg error';
    msg.textContent = 'All fields are required.';
    return;
  }

  if (pass.length < 6) {
    msg.className = 'msg error';
    msg.textContent = 'Password must be at least 6 characters.';
    return;
  }

  if (pass !== passConfirm) {
    msg.className = 'msg error';
    msg.textContent = 'Passwords do not match.';
    return;
  }

  if (selectedRole === 'admin') {
    msg.className = 'msg error';
    msg.textContent = 'Administrator accounts cannot be self-registered. Only the primary administrator is permitted.';
    return;
  }

  if (db.users.find(u => u.email.toLowerCase() === email)) {
    msg.className = 'msg error';
    msg.textContent = 'This email is already registered. Try signing in.';
    return;
  }

  const hashed = await hashPassword(pass);
  const newUserId = genId();
  const newUser = { id: newUserId, name, email, phone, pass: hashed, role: selectedRole, createdAt: new Date().toISOString() };
  db.users.push(newUser);

  if (selectedRole === 'driver') {
    const license = document.getElementById('regLicense').value.trim() || 'DL-' + Math.floor(10000 + Math.random() * 90000);
    db.drivers.push({ id: genId(), userId: newUserId, name, phone, license, experience: 2, status: 'active', owner: null });
  }

  save();
  switchTab('login');
  document.getElementById('loginEmail').value = email;
  const lmsg = document.getElementById('loginMsg');
  lmsg.className = 'msg success';
  lmsg.textContent = '✅ Account created! Sign in now.';
  toast('Registration successful!', 'ok');
}

function logout() {
  if (currentUser) {
    logAudit('LOGOUT', 'Auth', 'User ' + currentUser.name + ' logged out');
  }
  currentUser = null;
  sessionStorage.removeItem('vrms_user');
  showView('landing');
}

// =====================================================================
// DASHBOARD ROUTING
// =====================================================================

function loadDashboard() {
  document.querySelectorAll('.view').forEach(el => el.classList.remove('active'));
  document.getElementById('dashboard').classList.add('active');
  document.querySelector('nav').style.display = '';

  const av = document.getElementById('sideAvatar');
  av.textContent = currentUser.name[0].toUpperCase();
  av.className = 'user-avatar av-' + currentUser.role;
  document.getElementById('sideName').textContent = currentUser.name;
  
  const roleTitles = {
    user: 'Rental Customer',
    driver: 'Professional Driver',
    owner: 'Fleet Vehicle Owner',
    admin: 'System Administrator'
  };
  document.getElementById('sideRole').textContent = roleTitles[currentUser.role] || currentUser.role;

  updateNav();
  buildNav();
  loadPage(getDefaultPage());
}

function getDefaultPage() {
  return {
    user: 'u_home',
    driver: 'd_home',
    owner: 'o_home',
    admin: 'a_home'
  }[currentUser.role];
}


// =====================================================================
// NAVIGATION CONFIGURATION FOR ALL 4 ROLES
// =====================================================================


// =====================================================================
// NAVIGATION CONFIGURATION FOR ALL 4 ROLES
// =====================================================================


// =====================================================================
// NAVIGATION CONFIGURATION FOR ALL 4 ROLES
// =====================================================================

function buildNav() {
  const items = {
    user: [
      { id: 'u_home', icon: '🏠', label: 'Dashboard' },
      { id: 'u_vehicles', icon: '🚗', label: 'Browse Vehicles' },
      { id: 'u_bookings', icon: '📋', label: 'My Bookings' },
      { id: 'u_payment', icon: '💳', label: 'Payments' },
      { id: 'u_live', icon: '📍', label: 'Live Trip' },
      { id: 'u_notifications', icon: '🔔', label: 'Notifications' },
      { id: 'u_favorites', icon: '❤️', label: 'Favorites' },
      { id: 'u_reviews', icon: '⭐', label: 'Reviews' },
      { id: 'u_profile', icon: '👤', label: 'Profile' }
    ],
    driver: [
      { id: 'd_home', icon: '🏠', label: 'Dashboard' },
      { id: 'd_trips', icon: '🗺️', label: 'Assigned Trips' },
      { id: 'd_fuel', icon: '⛽', label: 'Fuel & Trip Log' },
      { id: 'd_earnings', icon: '💰', label: 'Earnings' },
      { id: 'd_leave', icon: '📅', label: 'Leave & Availability' },
      { id: 'd_notifications', icon: '🔔', label: 'Notifications' },
      { id: 'd_ratings', icon: '⭐', label: 'Ratings' },
      { id: 'd_profile', icon: '👤', label: 'Profile' }
    ],
    owner: [
      { id: 'o_home', icon: '🏠', label: 'Dashboard' },
      { id: 'o_vehicles', icon: '🚗', label: 'My Fleet' },
      { id: 'o_bookings', icon: '📋', label: 'Booking Requests' },
      { id: 'o_calendar', icon: '📅', label: 'Booking Calendar' },
      { id: 'o_driver', icon: '👨‍✈️', label: 'Driver Management' },
      { id: 'o_documents', icon: '📑', label: 'Vehicle Documents' },
      { id: 'o_notifications', icon: '🔔', label: 'Notifications' },
      { id: 'o_profile', icon: '👤', label: 'Profile' }
    ],
    admin: [
      { id: 'a_home', icon: '🏠', label: 'Dashboard' },
      { id: 'a_users', icon: '👥', label: 'User Management' },
      { id: 'a_vehicles', icon: '🚗', label: 'Vehicle Management' },
      { id: 'a_bookings', icon: '📋', label: 'Booking Management' },
      { id: 'a_payments', icon: '💰', label: 'Payment Management' },
      { id: 'a_driver_verify', icon: '👨‍✈️', label: 'Driver Verification' },
      { id: 'a_fleet_verify', icon: '🏢', label: 'Fleet Verification' },
      { id: 'a_maintenance', icon: '🛠️', label: 'Maintenance Management' },
      { id: 'a_complaints', icon: '🎧', label: 'Complaint Management' },
      { id: 'a_notif_center', icon: '📢', label: 'Notification Center' },
      { id: 'a_reports', icon: '📊', label: 'Reports & Analytics' }
      
    ]
  };

  const navEl = document.getElementById('navItems');
  if (navEl && currentUser) {
    navEl.innerHTML = (items[currentUser.role] || []).map(i => `
      <div class="nav-item" id="nav_${i.id}" onclick="loadPage('${i.id}')">
        <span>${i.icon}</span> ${i.label}
      </div>
    `).join('');
  }
}

function loadPage(id) {
  document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
  const el = document.getElementById('nav_' + id);
  if (el) el.classList.add('active');

  const pages = {
    // Customer
    u_home, u_vehicles, u_bookings, u_payment, u_live, u_notifications, u_favorites, u_reviews, u_profile,
    // Driver
    d_home, d_trips, d_fuel, d_earnings, d_leave, d_notifications, d_ratings, d_profile,
    // Fleet Owner
    o_home, o_vehicles, o_bookings, o_calendar, o_driver, o_documents, o_notifications, o_profile,
    // Admin
    a_home, a_users, a_vehicles, a_bookings, a_payments, a_driver_verify, a_fleet_verify, a_maintenance, a_complaints, a_notif_center, a_reports
  };

  const fn = pages[id];
  if (fn) {
    const main = document.getElementById('mainContent');
    if (main) main.innerHTML = fn();
  }
}

function isFavorite(vid) {
  return (db.favorites || []).some(f => f.userId === currentUser?.id && f.vehicleId === vid);
}

function toggleFavorite(vid, event) {
  if (event) event.stopPropagation();
  if (!currentUser) return toast('Please log in first', 'err');
  if (!db.favorites) db.favorites = [];
  const idx = db.favorites.findIndex(f => f.userId === currentUser.id && f.vehicleId === vid);
  if (idx >= 0) {
    db.favorites.splice(idx, 1);
    toast('Removed from favorites', 'ok');
  } else {
    db.favorites.push({ id: genId(), userId: currentUser.id, vehicleId: vid, addedAt: new Date().toISOString() });
    toast('Added to favorites! ❤️', 'ok');
  }
  save();
  const curPage = document.querySelector('.nav-item.active')?.id?.replace('nav_', '');
  if (curPage) loadPage(curPage);
}


// =====================================================================
// 🙋 CUSTOMER MODULE
// =====================================================================

function u_home() {
  const mine = (db.bookings || []).filter(b => b.userId === currentUser.id);
  const active = mine.filter(b => b.status === 'active').length;
  const upcoming = mine.filter(b => b.status === 'approved' || b.status === 'pending').length;
  const completed = mine.filter(b => b.status === 'completed').length;
  const cancelled = mine.filter(b => b.status === 'cancelled').length;

  const favs = (db.favorites || []).filter(f => f.userId === currentUser.id);
  const favVehicles = (db.vehicles || []).filter(v => favs.some(f => f.vehicleId === v.id));

  const notifs = (db.notifications || []).filter(n => n.to === currentUser.id || n.to === 'all' || n.to === 'user').slice(-3).reverse();

  return `
    <div class="page-title">Welcome back, ${currentUser.name.split(' ')[0]}! 🙋</div>
    <div class="page-sub">Your personal vehicle rental hub & travel command center</div>
    
    <!-- STATS SUMMARY -->
    <div class="stats-row">
      <div class="stat-card">
        <div class="label">Active Trips</div>
        <div class="value" style="color:var(--success)">${active}</div>
        <div class="change">Currently on the road</div>
      </div>
      <div class="stat-card">
        <div class="label">Upcoming Bookings</div>
        <div class="value" style="color:var(--accent)">${upcoming}</div>
        <div class="change">Approved & pending</div>
      </div>
      <div class="stat-card">
        <div class="label">Completed Trips</div>
        <div class="value" style="color:var(--accent2)">${completed}</div>
        <div class="change">Successfully returned</div>
      </div>
      <div class="stat-card">
        <div class="label">Cancelled</div>
        <div class="value" style="color:var(--danger)">${cancelled}</div>
        <div class="change">Past cancelled bookings</div>
      </div>
    </div>

    <!-- QUICK VEHICLE SEARCH SHORTCUT -->
    <div class="section-card" style="background:linear-gradient(135deg,rgba(37,99,235,.06),rgba(8,145,178,.04));border-color:rgba(37,99,235,.2);">
      <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px;">
        <div>
          <h3 style="margin-bottom:4px;color:var(--accent);">🔍 Quick Vehicle Finder</h3>
          <p style="font-size:.82rem;color:var(--muted);">Find available cars in your city hub instantly with guaranteed conflict-free booking.</p>
        </div>
        <div style="display:flex;gap:10px;flex:1;max-width:450px;">
          <input type="text" id="quickSearchInput" placeholder="Search by model, sedan, SUV..." style="background:#fff;" onkeydown="if(event.key==='Enter') quickSearchGo()">
          <button class="btn btn-accent" onclick="quickSearchGo()">Search Vehicles</button>
        </div>
      </div>
    </div>

    <!-- FAVORITES SHORTCUT -->
    ${favVehicles.length > 0 ? `
      <div class="section-card">
        <h3>❤️ Favorite Vehicles Shortcut</h3>
        <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:14px;">
          ${favVehicles.slice(0, 4).map(v => `
            <div style="background:var(--surface2);border-radius:12px;padding:14px;border:1px solid var(--border);display:flex;align-items:center;gap:12px;">
              <span style="font-size:2rem;">${v.img}</span>
              <div style="flex:1;">
                <div style="font-weight:700;font-size:.88rem;">${v.name}</div>
                <div style="font-size:.76rem;color:var(--muted);">৳${v.price}/day · ${v.location.split(' - ')[0]}</div>
                <button class="btn btn-accent btn-sm" style="margin-top:6px;padding:3px 10px;font-size:.75rem;" onclick="openBookModal(${v.id})">Book Now</button>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    ` : ''}

    <!-- RECENT NOTIFICATIONS PREVIEW -->
    ${notifs.length > 0 ? `
      <div class="section-card">
        <h3>🔔 Recent Notifications Preview <button class="btn btn-ghost btn-sm" onclick="loadPage('u_notifications')">View All →</button></h3>
        <div style="display:flex;flex-direction:column;gap:8px;">
          ${notifs.map(n => `
            <div style="padding:10px 14px;background:var(--surface2);border-radius:8px;font-size:.83rem;display:flex;justify-content:space-between;align-items:center;">
              <div>
                <strong>${n.title}</strong> — ${n.body || n.message}
              </div>
              <span style="font-size:.72rem;color:var(--muted);">${new Date(n.date || Date.now()).toLocaleDateString()}</span>
            </div>
          `).join('')}
        </div>
      </div>
    ` : ''}

    <!-- RECENT BOOKINGS -->
    <div class="section-card">
      <h3>Recent Travel Bookings</h3>
      ${mine.length === 0 ? '<p style="color:var(--muted);font-size:.85rem;">No bookings yet. <a href="#" onclick="loadPage(\'u_vehicles\')" style="color:var(--accent);font-weight:600;">Browse Vehicles Now →</a></p>' : `
      <table>
        <tr><th>Vehicle</th><th>Dates</th><th>Pickup Hub</th><th>Amount</th><th>Status</th><th>Actions</th></tr>
        ${[...mine].reverse().slice(0, 5).map(b => `
          <tr>
            <td><strong>${b.vehicleName}</strong></td>
            <td>${b.from} → ${b.to} (${b.days}d)</td>
            <td>${b.pickupLoc || 'Banani Hub'}</td>
            <td>৳${b.amount.toLocaleString()}</td>
            <td><span class="badge badge-${b.status}">${b.status}</span></td>
            <td>
              <div style="display:flex;gap:6px;">
                <button class="btn btn-ghost btn-sm" onclick="openBookingDetailsModal(${b.id})">Details</button>
                ${(b.status === 'approved' || b.status === 'active' || b.status === 'completed') ? `
                  <button class="btn btn-outline btn-sm" onclick="printInvoice(${b.id})">📄 Invoice</button>
                ` : ''}
              </div>
            </td>
          </tr>
        `).join('')}
      </table>`}
    </div>
  `;
}

function quickSearchGo() {
  const q = document.getElementById('quickSearchInput')?.value.trim();
  vehicleSearchQuery = q || '';
  loadPage('u_vehicles');
}

// ---------------------------------------------------------------------
// BROWSE VEHICLES & SEARCH WITH ALL FILTERS & SLOTS
// ---------------------------------------------------------------------

let vehicleFilterLocation = 'all';
let vehicleFilterType = 'all';
let vehicleFilterFuel = 'all';
let vehicleFilterSeats = 'all';
let vehiclePriceSort = 'default';
let vehicleSearchQuery = '';

// Journey search state (From -> To on a specific date)
let journeyFrom = '';
let journeyTo = '';
let journeyDate = '';
let journeyReturn = '';
let journeySearched = false;

// ---------- Journey helpers ----------
function addDaysStr(dateStr, n) {
  const d = new Date(dateStr + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().split('T')[0];
}

function journeyActive() {
  return journeySearched && !!journeyFrom && !!journeyTo && !!journeyDate;
}

// One-way trip = 1 rental day (date -> next day). Optional return date extends it.
function journeyRange() {
  const to = (journeyReturn && journeyReturn > journeyDate) ? journeyReturn : addDaysStr(journeyDate, 1);
  return { from: journeyDate, to, days: Math.round((new Date(to) - new Date(journeyDate)) / 86400000) };
}

function getCities() {
  return [...new Set((db.locations || []).map(l => l.city))];
}

function getVehicleCity(v) {
  const loc = (db.locations || []).find(l => l.id === v.locationId || l.name === v.location);
  if (loc) return loc.city;
  return ((v.location || '').split(' - ')[0] || '').trim();
}

// ---------- System Recommendation (quality score 0-100) ----------
// Rating 45 + Vehicle age 20 + Maintenance record 20 + Document validity 15
function getVehicleQuality(v) {
  const todayStr = new Date().toISOString().split('T')[0];

  // 1. Customer rating (Bayesian-smoothed so 1 review can't beat 20 reviews; prior = 4.0 x 3 votes)
  const revs = getVehicleReviews(v.id);
  const sum = revs.reduce((a, r) => a + Number(r.vehicleRating || 0), 0);
  const bayes = (sum + 4.0 * 3) / (revs.length + 3);
  const ratingPts = Math.max(0, Math.min(1, bayes / 5)) * 45;

  // 2. Vehicle age (model year parsed from name; unknown year = neutral)
  const yr = (v.name || '').match(/\b(19|20)\d{2}\b/);
  let agePts = 0.6 * 20;
  if (yr) {
    const age = Math.max(0, new Date().getFullYear() - parseInt(yr[0], 10));
    agePts = Math.max(0, 1 - age / 12) * 20;
  }

  // 3. Maintenance record (open critical issues hurt most)
  let penalty = 0;
  (db.maintenance_reports || []).filter(r => r.vehicleId === v.id).forEach(r => {
    if (r.status === 'resolved') penalty += 0.03;
    else penalty += (r.severity === 'critical') ? 0.4 : 0.15;
  });
  const maintPts = Math.max(0, 1 - penalty) * 20;

  // 4. Documents (share of verified & unexpired; none on file = neutral)
  const docs = (db.documents || []).filter(d => d.vehicleId === v.id);
  const docFrac = docs.length
    ? docs.filter(d => d.status === 'verified' && d.expiryDate >= todayStr).length / docs.length
    : 0.6;
  const docPts = docFrac * 15;

  const score = Math.round(ratingPts + agePts + maintPts + docPts);
  let tier = 'Standard';
  if (score >= 85) tier = 'Premium';
  else if (score >= 75) tier = 'Excellent';
  else if (score >= 60) tier = 'Good';

  return {
    score, tier,
    detail: `Rating ${ratingPts.toFixed(0)}/45 · Age ${agePts.toFixed(0)}/20 · Maintenance ${maintPts.toFixed(0)}/20 · Documents ${docPts.toFixed(0)}/15`
  };
}

function u_vehicles() {
  const journeyOn = journeyActive();
  const range = journeyOn ? journeyRange() : null;
  const cities = getCities();
  const todayStr = new Date().toISOString().split('T')[0];

  let list = db.vehicles.filter(v => v.status === 'available');
  let blockedCount = 0;

  if (journeyOn) {
    // Vehicle must be based in the departure city...
    list = list.filter(v => getVehicleCity(v).toLowerCase() === journeyFrom.toLowerCase());
    // ...and free for the whole journey window
    const total = list.length;
    list = list.filter(v => !checkBookingOverlap(v.id, range.from, range.to));
    blockedCount = total - list.length;
  } else if (vehicleFilterLocation !== 'all') {
    list = list.filter(v => (v.location || '').toLowerCase().includes(vehicleFilterLocation.toLowerCase()));
  }

  if (vehicleFilterType !== 'all') {
    list = list.filter(v => v.type.toLowerCase() === vehicleFilterType.toLowerCase());
  }

  if (vehicleFilterFuel !== 'all') {
    list = list.filter(v => (v.fuel || '').toLowerCase() === vehicleFilterFuel.toLowerCase());
  }

  if (vehicleFilterSeats !== 'all') {
    const minSeats = parseInt(vehicleFilterSeats);
    list = list.filter(v => v.seats >= minSeats);
  }

  if (vehicleSearchQuery.trim()) {
    const q = vehicleSearchQuery.toLowerCase().trim();
    list = list.filter(v =>
      v.name.toLowerCase().includes(q) ||
      v.type.toLowerCase().includes(q) ||
      (v.regNo || '').toLowerCase().includes(q)
    );
  }

  // Sorting: during a journey search the System Recommendation is the default
  const sortMode = (journeyOn && vehiclePriceSort === 'default') ? 'recommended' : vehiclePriceSort;
  const quality = {};
  list.forEach(v => { quality[v.id] = getVehicleQuality(v); });

  if (sortMode === 'recommended') {
    list.sort((a, b) =>
      (quality[b.id].score - quality[a.id].score) ||
      (getVehicleAvgRating(b.id) - getVehicleAvgRating(a.id)) ||
      (b.price - a.price)
    );
  }
  if (sortMode === 'asc') list.sort((a, b) => a.price - b.price);
  if (sortMode === 'desc') list.sort((a, b) => b.price - a.price);
  if (sortMode === 'rating') list.sort((a, b) => getVehicleAvgRating(b.id) - getVehicleAvgRating(a.id));

  const cityOpts = (sel) => `<option value="">Select city</option>` +
    cities.map(c => `<option value="${c}" ${sel === c ? 'selected' : ''}>${c}</option>`).join('');

  return `
    <div class="page-title">Browse Rental Fleet</div>
    <div class="page-sub">Tell us where and when you're travelling — we'll show only vehicles free for your journey, ranked from highest to lowest quality</div>

    <!-- JOURNEY SEARCH -->
    <div class="journey-panel">
      <div class="journey-title">🧭 Plan Your Journey</div>
      <div class="journey-grid">
        <div>
          <label>From</label>
          <select id="jFrom">${cityOpts(journeyFrom)}</select>
        </div>
        <button class="journey-swap" type="button" onclick="swapJourneyCities()" title="Swap From / To">⇄</button>
        <div>
          <label>To</label>
          <select id="jTo">${cityOpts(journeyTo)}</select>
        </div>
        <div>
          <label>Travel Date</label>
          <input type="date" id="jDate" min="${todayStr}" value="${journeyDate}">
        </div>
        <div>
          <label>Return Date <span style="font-weight:400;color:var(--muted);">(optional)</span></label>
          <input type="date" id="jReturn" min="${todayStr}" value="${journeyReturn}">
        </div>
        <button class="btn btn-accent journey-go" onclick="searchJourney()">🔍 Find Vehicles</button>
      </div>

      ${journeyOn ? `
        <div class="journey-summary">
          <div>
            <strong>${journeyFrom} → ${journeyTo}</strong> · ${range.from}${journeyReturn && journeyReturn > journeyDate ? ' to ' + range.to : ' (one-way, 1 day)'}
            <span class="journey-count">${list.length} vehicle${list.length === 1 ? '' : 's'} available${blockedCount ? ` · ${blockedCount} already booked` : ''}</span>
          </div>
          <button class="btn btn-ghost btn-sm" onclick="clearJourney()">✕ Clear Journey</button>
        </div>
      ` : ''}
    </div>

    <!-- FILTER BAR -->
    <div class="filter-bar">
      <div class="filter-input">
        <input type="text" id="vehSearchInput" placeholder="Search by model or reg no..." value="${vehicleSearchQuery}" oninput="onVehSearch(this.value)">
      </div>

      ${journeyOn ? '' : `
      <div class="filter-select">
        <select onchange="onVehFilterLoc(this.value)">
          <option value="all">📍 All Locations / Cities</option>
          <option value="Dhaka" ${vehicleFilterLocation==='Dhaka'?'selected':''}>Dhaka (All Hubs)</option>
          <option value="Banani" ${vehicleFilterLocation==='Banani'?'selected':''}>Banani Hub (Dhaka)</option>
          <option value="Dhanmondi" ${vehicleFilterLocation==='Dhanmondi'?'selected':''}>Dhanmondi Hub (Dhaka)</option>
          <option value="Uttara" ${vehicleFilterLocation==='Uttara'?'selected':''}>Uttara Terminal (Dhaka)</option>
          <option value="Chittagong" ${vehicleFilterLocation==='Chittagong'?'selected':''}>Chittagong (GEC)</option>
          <option value="Sylhet" ${vehicleFilterLocation==='Sylhet'?'selected':''}>Sylhet (Zindabazar)</option>
          <option value="Cox's Bazar" ${vehicleFilterLocation==="Cox's Bazar"?'selected':''}>Cox's Bazar (Kolatoli)</option>
        </select>
      </div>`}

      <div class="filter-select">
        <select onchange="onVehFilterType(this.value)">
          <option value="all">🚗 All Types</option>
          <option value="Sedan" ${vehicleFilterType==='Sedan'?'selected':''}>Sedan</option>
          <option value="SUV" ${vehicleFilterType==='SUV'?'selected':''}>SUV</option>
          <option value="Van" ${vehicleFilterType==='Van'?'selected':''}>Van</option>
          <option value="Minibus" ${vehicleFilterType==='Minibus'?'selected':''}>Minibus</option>
          <option value="Motorcycle" ${vehicleFilterType==='Motorcycle'?'selected':''}>Motorcycle</option>
        </select>
      </div>

      <div class="filter-select">
        <select onchange="onVehFilterFuel(this.value)">
          <option value="all">⛽ All Fuels</option>
          <option value="Octane" ${vehicleFilterFuel==='Octane'?'selected':''}>Octane</option>
          <option value="Diesel" ${vehicleFilterFuel==='Diesel'?'selected':''}>Diesel</option>
          <option value="Petrol" ${vehicleFilterFuel==='Petrol'?'selected':''}>Petrol</option>
          <option value="Hybrid" ${vehicleFilterFuel==='Hybrid'?'selected':''}>Hybrid</option>
          <option value="Electric" ${vehicleFilterFuel==='Electric'?'selected':''}>Electric</option>
        </select>
      </div>

      <div class="filter-select">
        <select onchange="onVehSort(this.value)">
          <option value="default" ${sortMode==='default'?'selected':''}>Sort: Default</option>
          <option value="recommended" ${sortMode==='recommended'?'selected':''}>⭐ System Recommendation (Best → Lowest)</option>
          <option value="asc" ${sortMode==='asc'?'selected':''}>Price: Low to High</option>
          <option value="desc" ${sortMode==='desc'?'selected':''}>Price: High to Low</option>
          <option value="rating" ${sortMode==='rating'?'selected':''}>Customer Rating</option>
        </select>
      </div>

      ${(vehicleFilterLocation!=='all' || vehicleFilterType!=='all' || vehicleFilterFuel!=='all' || vehicleSearchQuery || vehiclePriceSort!=='default') ? `
        <button class="btn btn-ghost btn-sm" onclick="resetVehFilters()">Reset Filters</button>
      ` : ''}
    </div>

    <!-- VEHICLES GRID -->
    <div class="vehicles-grid">
      ${list.length === 0 ? `
        <div style="grid-column:1/-1;text-align:center;padding:50px;background:var(--surface);border-radius:14px;border:1px solid var(--border);">
          <div style="font-size:2.5rem;margin-bottom:10px;">🔍</div>
          <h3>${journeyOn ? 'No vehicles available for this journey' : 'No matching vehicles found'}</h3>
          <p style="color:var(--muted);font-size:.85rem;margin-top:6px;">${journeyOn
            ? `No vehicle based in ${journeyFrom} is free on ${range.from}${range.to !== addDaysStr(range.from, 1) ? ' – ' + range.to : ''}. Try another date or a different pickup city.`
            : 'Try adjusting your location, vehicle type, or search terms.'}</p>
          <button class="btn btn-accent btn-sm" style="margin-top:16px;" onclick="${journeyOn ? 'clearJourney()' : 'resetVehFilters()'}">${journeyOn ? 'Clear Journey' : 'Show All Vehicles'}</button>
        </div>
      ` : list.map((v, idx) => {
        const avg = getVehicleAvgRating(v.id);
        const revCount = getVehicleReviews(v.id).length;
        const nextSlot = getNextUnavailableSlot(v.id);
        const fav = isFavorite(v.id);
        const q = quality[v.id];

        let slotBadge = '<div class="slot-badge slot-avail">🟢 Available Now · No Upcoming Bookings</div>';
        if (journeyOn) {
          slotBadge = `<div class="slot-badge slot-avail">✅ Free for ${journeyFrom} → ${journeyTo} · ${range.from}${range.days > 1 ? ' to ' + range.to : ''}</div>`;
        } else if (nextSlot) {
          if (nextSlot.type === 'current') {
            slotBadge = `<div class="slot-badge slot-busy">🔴 Currently On Trip (until ${nextSlot.to})</div>`;
          } else {
            slotBadge = `<div class="slot-badge slot-booked">📅 Next Unavailable: ${nextSlot.from} to ${nextSlot.to}</div>`;
          }
        }

        const rankBadge = sortMode === 'recommended'
          ? `<span class="rec-rank ${idx === 0 ? 'top' : ''}">${idx === 0 ? '🏆 Top Pick' : '#' + (idx + 1)}</span>` : '';

        return `
          <div class="v-card">
            <div class="v-card-img">
              <span class="v-card-loc">📍 ${v.location}</span>
              ${rankBadge}
              <button class="fav-btn ${fav?'active':''}" onclick="toggleFavorite(${v.id}, event)" title="${fav?'Remove from favorites':'Add to favorites'}">
                ${fav ? '❤️' : '🤍'}
              </button>
              ${v.img}
            </div>
            <div class="v-card-body">
              <div class="v-card-title-row">
                <h4>${v.name}</h4>
                <span class="v-rating-tag">★ ${avg} (${revCount})</span>
              </div>
              <div class="vtype">${v.type} · ${v.seats} Seats · ${v.fuel} · Reg: ${v.regNo || 'Verified'}</div>

              <div class="q-score" title="${q.detail}">
                <div class="q-head"><span>⭐ ${q.tier} Quality</span><strong>${q.score}/100</strong></div>
                <div class="q-bar"><i class="q-${q.tier.toLowerCase()}" style="width:${q.score}%"></i></div>
              </div>

              ${slotBadge}

              <div class="price">৳${v.price.toLocaleString()}<span>/day</span></div>
              ${journeyOn ? `<div class="trip-est">Est. trip total: <strong>৳${(v.price * range.days).toLocaleString()}</strong> (${range.days} day${range.days > 1 ? 's' : ''})</div>` : ''}
            </div>
            <div class="v-card-footer">
              <button class="btn btn-ghost btn-sm" style="flex:1;" onclick="openVehicleDetailsModal(${v.id})">Details</button>
              <button class="btn btn-accent btn-sm" style="flex:1;" onclick="openBookModal(${v.id})">Book Now</button>
            </div>
          </div>
        `;
      }).join('')}
    </div>
  `;
}

function searchJourney() {
  const from = document.getElementById('jFrom').value;
  const to = document.getElementById('jTo').value;
  const date = document.getElementById('jDate').value;
  const ret = document.getElementById('jReturn').value;
  const todayStr = new Date().toISOString().split('T')[0];

  if (!from || !to) return toast('Please select both departure and destination cities', 'err');
  if (from === to) return toast('Departure and destination must be different cities', 'err');
  if (!date) return toast('Please choose your travel date', 'err');
  if (date < todayStr) return toast('Travel date cannot be in the past', 'err');
  if (ret && ret <= date) return toast('Return date must be after the travel date', 'err');

  journeyFrom = from; journeyTo = to; journeyDate = date; journeyReturn = ret;
  journeySearched = true;
  vehicleFilterLocation = 'all';
  vehiclePriceSort = 'default'; // journey results default to System Recommendation
  loadPage('u_vehicles');
}

function clearJourney() {
  journeyFrom = ''; journeyTo = ''; journeyDate = ''; journeyReturn = '';
  journeySearched = false;
  loadPage('u_vehicles');
}

function swapJourneyCities() {
  const f = document.getElementById('jFrom'), t = document.getElementById('jTo');
  if (!f || !t) return;
  const tmp = f.value; f.value = t.value; t.value = tmp;
}

function onVehSearch(val) { vehicleSearchQuery = val; loadPage('u_vehicles'); }
function onVehFilterLoc(val) { vehicleFilterLocation = val; loadPage('u_vehicles'); }
function onVehFilterType(val) { vehicleFilterType = val; loadPage('u_vehicles'); }
function onVehFilterFuel(val) { vehicleFilterFuel = val; loadPage('u_vehicles'); }
function onVehSort(val) { vehiclePriceSort = val; loadPage('u_vehicles'); }
function resetVehFilters() {
  vehicleFilterLocation = 'all';
  vehicleFilterType = 'all';
  vehicleFilterFuel = 'all';
  vehicleSearchQuery = '';
  vehiclePriceSort = 'default';
  loadPage('u_vehicles');
}

// ---------------------------------------------------------------------
// BOOKING MODAL & RESCHEDULING WITH STRICT OVERLAP PREVENTION
// ---------------------------------------------------------------------

function openBookModal(vid) {
  const v = db.vehicles.find(x => x.id === vid);
  if (!v) return;

  // Prefill from the Journey search (if any)
  const jr = journeyActive() ? journeyRange() : null;
  const jDropHub = jr ? ((db.locations || []).find(l => l.city.toLowerCase() === journeyTo.toLowerCase()) || {}).name : null;
  const dropDefault = jDropHub || v.location;

  const todayStr = new Date().toISOString().split('T')[0];
  const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().split('T')[0];

  const existingBookings = (db.bookings || [])
    .filter(b => b.vehicleId === vid && b.status !== 'cancelled' && b.to >= todayStr)
    .sort((a, b) => a.from.localeCompare(b.from));

  const bookedSlotsHtml = existingBookings.length === 0 ? 
    `<div style="font-size:.78rem;color:var(--success);padding:6px 10px;background:rgba(22,163,74,.08);border-radius:6px;margin-bottom:14px;">✓ No booked slots on record. Flexible to book anytime!</div>` :
    `<div style="margin-bottom:14px;padding:10px;background:var(--surface2);border-radius:8px;font-size:.78rem;">
      <div style="font-weight:700;color:var(--warning);margin-bottom:4px;">⚠️ Already Booked Dates (Please avoid selecting these):</div>
      <ul style="padding-left:18px;color:var(--text);">
        ${existingBookings.map(b => `<li><strong>${b.from}</strong> to <strong>${b.to}</strong> (${b.status.toUpperCase()})</li>`).join('')}
      </ul>
    </div>`;

  const locations = db.locations || [];

  openModal(`Reserve ${v.name}`, '', `
    <div style="display:flex;align-items:center;gap:12px;margin-bottom:12px;">
      <span style="font-size:2rem;">${v.img}</span>
      <div>
        <div style="font-weight:700;">${v.name}</div>
        <div style="font-size:.8rem;color:var(--muted);">Rate: <strong>৳${v.price}/day</strong> · Hub: ${v.location}</div>
      </div>
    </div>

    ${bookedSlotsHtml}

    <div class="form-grid" style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
      <div>
        <label style="margin-top:0;">Pickup Date</label>
        <input type="date" id="bkFrom" min="${todayStr}" value="${jr ? jr.from : ''}" oninput="onPickupDateChange()">
      </div>
      <div>
        <label style="margin-top:0;">Return Date</label>
        <input type="date" id="bkTo" min="${tomorrowStr}" value="${jr ? jr.to : ''}" oninput="onReturnDateChange()">
      </div>
    </div>
    
    <div id="dateOverlapAlert" style="display:none;margin-top:10px;padding:10px;border-radius:8px;background:rgba(220,38,38,.08);border:1px solid rgba(220,38,38,.2);color:var(--danger);font-size:.8rem;"></div>

    <div class="form-grid" style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:12px;">
      <div>
        <label style="margin-top:0;">Pickup Hub Location</label>
        <select id="bkPickupLoc">
          ${locations.map(l => `<option value="${l.name}" ${l.name===v.location?'selected':''}>${l.name}</option>`).join('')}
        </select>
      </div>
      <div>
        <label style="margin-top:0;">Drop-off Hub Location</label>
        <select id="bkDropLoc">
          ${locations.map(l => `<option value="${l.name}" ${l.name===dropDefault?'selected':''}>${l.name}</option>`).join('')}
        </select>
      </div>
    </div>

    <div id="costCalculationBox" style="margin-top:14px;padding:12px;background:var(--surface2);border-radius:8px;display:none;">
      <div style="display:flex;justify-content:space-between;font-size:.85rem;margin-bottom:4px;">
        <span>Rental Duration:</span>
        <strong id="calcDays">0 days</strong>
      </div>
      <div style="display:flex;justify-content:space-between;font-size:.85rem;margin-bottom:6px;">
        <span>Daily Rate:</span>
        <span>৳${v.price} / day</span>
      </div>
      <div style="display:flex;justify-content:space-between;border-top:1px solid var(--border);padding-top:6px;font-size:1.05rem;font-weight:800;color:var(--accent);">
        <span>Estimated Total:</span>
        <span id="calcTotal">৳0</span>
      </div>
    </div>
  `, () => {
    const from = document.getElementById('bkFrom').value;
    const to = document.getElementById('bkTo').value;
    const pickupLoc = document.getElementById('bkPickupLoc').value;
    const dropLoc = document.getElementById('bkDropLoc').value;
    const alertBox = document.getElementById('dateOverlapAlert');

    if (!from || !to) {
      alertBox.textContent = 'Please choose both pickup and return dates.';
      alertBox.style.display = 'block';
      return;
    }

    if (to <= from) {
      alertBox.textContent = 'Return date must be strictly after pickup date.';
      alertBox.style.display = 'block';
      return;
    }

    // STRICT DATE OVERLAP CHECK
    const conflict = checkBookingOverlap(v.id, from, to);
    if (conflict) {
      alertBox.textContent = `❌ Date Conflict: This car is already booked from ${conflict.from} to ${conflict.to}. Please choose different dates.`;
      alertBox.style.display = 'block';
      return;
    }

    const days = Math.ceil((new Date(to) - new Date(from)) / (1000 * 60 * 60 * 24));
    const amount = v.price * days;

    // Pick an available on-duty driver
    const driver = (db.drivers || []).find(d => d.status === 'active' || d.driver_status === 'active') || { id: 1, name: 'Assigned Company Driver' };

    const newBooking = {
      id: genId(),
      vehicleId: v.id,
      vehicleName: v.name,
      userId: currentUser.id,
      userName: currentUser.name,
      driverId: driver.id,
      driverName: driver.name,
      from,
      to,
      days,
      amount,
      pickupLoc,
      dropLoc,
      status: 'pending',
      createdAt: new Date().toISOString()
    };

    db.bookings.push(newBooking);
    addNotif(v.owner || 'admin', 'New Vehicle Request', `${currentUser.name} requested ${v.name} (${from} to ${to})`);
    logAudit('BOOKING_CREATE', 'Booking', `Booking #${newBooking.id} created for ${v.name} by ${currentUser.name}`);
    save();
    closeModal();
    toast('Reservation request submitted! Proceeding to My Bookings...', 'ok');
    loadPage('u_bookings');
  });

  if (jr) updateCostAndOverlap();
}

function onPickupDateChange() {
  const fromEl = document.getElementById('bkFrom');
  const toEl = document.getElementById('bkTo');
  if (fromEl && toEl && fromEl.value) {
    const d = new Date(fromEl.value);
    d.setDate(d.getDate() + 1);
    toEl.min = d.toISOString().split('T')[0];
    if (toEl.value && toEl.value <= fromEl.value) toEl.value = '';
  }
  updateCostAndOverlap();
}

function onReturnDateChange() {
  updateCostAndOverlap();
}

function updateCostAndOverlap() {
  const from = document.getElementById('bkFrom')?.value;
  const to = document.getElementById('bkTo')?.value;
  const alertBox = document.getElementById('dateOverlapAlert');
  const costBox = document.getElementById('costCalculationBox');
  if (!from || !to || !alertBox || !costBox) return;

  if (to <= from) {
    alertBox.textContent = 'Return date must be after pickup date.';
    alertBox.style.display = 'block';
    costBox.style.display = 'none';
    return;
  }

  alertBox.style.display = 'none';
  const days = Math.ceil((new Date(to) - new Date(from)) / (1000 * 60 * 60 * 24));
  const rateMatch = document.getElementById('modalBody')?.textContent.match(/৳(\d+)\/day/);
  const rate = rateMatch ? parseInt(rateMatch[1]) : 3500;

  document.getElementById('calcDays').textContent = days + (days === 1 ? ' day' : ' days');
  document.getElementById('calcTotal').textContent = '৳' + (rate * days).toLocaleString();
  costBox.style.display = 'block';
}

function openVehicleDetailsModal(vid) {
  const v = db.vehicles.find(x => x.id === vid);
  const reviews = getVehicleReviews(vid);
  const avg = getVehicleAvgRating(vid);
  const nextSlot = getNextUnavailableSlot(vid);

  let slotStr = '🟢 Available Now (No pending or upcoming reservations)';
  if (nextSlot) {
    slotStr = (nextSlot.type === 'current') ?
      `🔴 Currently On Trip until ${nextSlot.to}` :
      `📅 Next Booked: ${nextSlot.from} to ${nextSlot.to}`;
  }

  openModal(`${v.name}`, '', `
    <div style="font-size:3rem;text-align:center;padding:10px 0;background:var(--surface2);border-radius:12px;margin-bottom:14px;">${v.img}</div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;font-size:.85rem;margin-bottom:14px;">
      <div><strong>Type:</strong> ${v.type}</div>
      <div><strong>Rate:</strong> ৳${v.price}/day</div>
      <div><strong>Hub:</strong> ${v.location}</div>
      <div><strong>Reg No:</strong> ${v.regNo || 'N/A'}</div>
      <div><strong>Capacity:</strong> ${v.seats} Passengers</div>
      <div><strong>Fuel Type:</strong> ${v.fuel}</div>
    </div>
    
    <div style="padding:10px;background:var(--surface2);border-radius:8px;font-size:.8rem;margin-bottom:16px;">
      <strong>Availability Status:</strong><br>${slotStr}
    </div>

    <h4 style="font-size:.9rem;margin-bottom:8px;">Customer Reviews (★ ${avg} avg · ${reviews.length} reviews)</h4>
    ${reviews.length === 0 ? '<p style="color:var(--muted);font-size:.8rem;">No customer reviews yet for this vehicle.</p>' : `
      <div style="max-height:160px;overflow-y:auto;">
        ${reviews.map(r => `
          <div class="review-item">
            <div class="review-header">
              <span>${r.userName || 'Verified Renter'}</span>
              <span style="color:#eab308;">${'★'.repeat(r.vehicleRating)}</span>
            </div>
            <div>${r.vehicleComment || 'Good experience.'}</div>
          </div>
        `).join('')}
      </div>
    `}
  `, () => {
    closeModal();
    openBookModal(vid);
  });
}

// ---------------------------------------------------------------------
// BOOKINGS MANAGEMENT & TIMELINE
// ---------------------------------------------------------------------

function u_bookings() {
  const mine = (db.bookings || []).filter(b => b.userId === currentUser.id);

  return `
    <div class="page-title">My Bookings</div>
    <div class="page-sub">Track booking progress, reschedule dates, make digital payments, and access printable invoices</div>
    
    <div class="section-card">
      ${mine.length === 0 ? '<p style="color:var(--muted);">No bookings found.</p>' : `
      <div style="display:flex;flex-direction:column;gap:18px;">
        ${[...mine].reverse().map(b => {
          const reviewed = hasReviewed(b.id);
          const isCancelled = b.status === 'cancelled';
          const steps = ['pending', 'approved', 'active', 'completed'];
          const curStepIdx = steps.indexOf(b.status);

          return `
            <div style="background:var(--surface2);border:1px solid var(--border);border-radius:12px;padding:16px;">
              <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;margin-bottom:12px;">
                <div>
                  <h4 style="font-size:1.05rem;margin-bottom:3px;">${b.vehicleName} <span class="badge badge-${b.status}">${b.status.toUpperCase()}</span></h4>
                  <div style="font-size:.8rem;color:var(--muted);">Booking ID: #${b.id} · Pickup: <strong>${b.pickupLoc || 'Banani'}</strong> ➔ Drop-off: <strong>${b.dropLoc || b.pickupLoc}</strong></div>
                </div>
                <div style="text-align:right;">
                  <div style="font-family:'Syne',sans-serif;font-size:1.2rem;font-weight:800;color:var(--accent);">৳${b.amount.toLocaleString()}</div>
                  <div style="font-size:.76rem;color:var(--muted);">${b.from} to ${b.to} (${b.days} days)</div>
                </div>
              </div>

              <!-- STATUS TIMELINE -->
              <div class="timeline">
                ${isCancelled ? `
                  <div class="timeline-node cancelled"><div class="timeline-dot">✕</div><div class="timeline-text" style="color:var(--danger)">Cancelled</div></div>
                ` : `
                  <div class="timeline-node ${curStepIdx >= 0 ? (curStepIdx === 0 ? 'active' : 'done') : ''}">
                    <div class="timeline-dot">${curStepIdx > 0 ? '✓' : '1'}</div>
                    <div class="timeline-text">Pending</div>
                  </div>
                  <div class="timeline-node ${curStepIdx >= 1 ? (curStepIdx === 1 ? 'active' : 'done') : ''}">
                    <div class="timeline-dot">${curStepIdx > 1 ? '✓' : '2'}</div>
                    <div class="timeline-text">Approved</div>
                  </div>
                  <div class="timeline-node ${curStepIdx >= 2 ? (curStepIdx === 2 ? 'active' : 'done') : ''}">
                    <div class="timeline-dot">${curStepIdx > 2 ? '✓' : '3'}</div>
                    <div class="timeline-text">Active Trip</div>
                  </div>
                  <div class="timeline-node ${curStepIdx === 3 ? 'done' : ''}">
                    <div class="timeline-dot">${curStepIdx === 3 ? '✓' : '4'}</div>
                    <div class="timeline-text">Completed</div>
                  </div>
                `}
              </div>

              <div style="display:flex;gap:8px;justify-content:flex-end;flex-wrap:wrap;border-top:1px solid rgba(0,0,0,.06);padding-top:12px;margin-top:8px;">
                <button class="btn btn-ghost btn-sm" onclick="openBookingDetailsModal(${b.id})">Booking Details</button>
                ${b.status === 'pending' ? `
                  <button class="btn btn-outline btn-sm" onclick="openRescheduleModal(${b.id})">📅 Reschedule</button>
                  <button class="btn btn-danger btn-sm" onclick="cancelBooking(${b.id})">Cancel</button>
                ` : ''}
                ${b.status === 'approved' ? `
                  <button class="btn btn-success btn-sm" onclick="loadPage('u_payment')">💳 Pay Now</button>
                ` : ''}
                ${(b.status === 'approved' || b.status === 'active' || b.status === 'completed') ? `
                  <button class="btn btn-outline btn-sm" onclick="printInvoice(${b.id})">📄 Tax Invoice</button>
                ` : ''}
                ${b.status === 'completed' && !reviewed ? `
                  <button class="btn btn-accent btn-sm" onclick="openReviewModal(${b.id})">⭐ Review Trip</button>
                ` : ''}
                ${b.status === 'completed' && reviewed ? `
                  <span style="font-size:.78rem;color:var(--success);font-weight:700;display:flex;align-items:center;padding:0 8px;">✓ Reviewed</span>
                ` : ''}
              </div>
            </div>
          `;
        }).join('')}
      </div>`}
    </div>
  `;
}

function openBookingDetailsModal(id) {
  const b = db.bookings.find(x => x.id === id);
  if (!b) return;
  const v = db.vehicles.find(x => x.id === b.vehicleId);

  openModal(`Booking Details #${b.id}`, '', `
    <div style="font-size:.86rem;line-height:1.7;">
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:12px;padding-bottom:10px;border-bottom:1px solid var(--border);">
        <span style="font-size:2.2rem;">${v ? v.img : '🚗'}</span>
        <div>
          <div style="font-weight:700;font-size:1rem;">${b.vehicleName}</div>
          <div style="color:var(--muted);font-size:.78rem;">Reg No: ${v?.regNo || 'Verified'} · Status: <span class="badge badge-${b.status}">${b.status}</span></div>
        </div>
      </div>
      <div><strong>Rental Interval:</strong> ${b.from} to ${b.to} (${b.days} days)</div>
      <div><strong>Pickup Location:</strong> ${b.pickupLoc || 'Banani Hub'}</div>
      <div><strong>Drop-off Location:</strong> ${b.dropLoc || b.pickupLoc || 'Banani Hub'}</div>
      <div><strong>Assigned Driver:</strong> 👨‍✈️ ${b.driverName || 'Will be assigned prior to departure'}</div>
      <div><strong>Total Amount:</strong> ৳${b.amount.toLocaleString()}</div>
      <div><strong>Created At:</strong> ${new Date(b.createdAt).toLocaleString()}</div>
    </div>
  `, () => closeModal());
}

function openRescheduleModal(id) {
  const b = db.bookings.find(x => x.id === id);
  if (!b) return;

  const todayStr = new Date().toISOString().split('T')[0];

  openModal(`Reschedule Booking #${b.id}`, '', `
    <p style="font-size:.84rem;color:var(--muted);margin-bottom:14px;">Select your new desired travel dates for <strong>${b.vehicleName}</strong>.</p>
    <div class="form-grid" style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
      <div>
        <label style="margin-top:0;">New Pickup Date</label>
        <input type="date" id="reschedFrom" min="${todayStr}" value="${b.from}">
      </div>
      <div>
        <label style="margin-top:0;">New Return Date</label>
        <input type="date" id="reschedTo" min="${todayStr}" value="${b.to}">
      </div>
    </div>
    <div id="reschedAlert" style="display:none;margin-top:10px;padding:8px 12px;background:rgba(220,38,38,.08);color:var(--danger);font-size:.8rem;border-radius:6px;"></div>
  `, () => {
    const newFrom = document.getElementById('reschedFrom').value;
    const newTo = document.getElementById('reschedTo').value;
    const alertEl = document.getElementById('reschedAlert');

    if (!newFrom || !newTo || newTo <= newFrom) {
      alertEl.textContent = 'Please enter valid pickup and return dates.';
      alertEl.style.display = 'block';
      return;
    }

    const conflict = checkBookingOverlap(b.vehicleId, newFrom, newTo, b.id);
    if (conflict) {
      alertEl.textContent = `Conflict: Vehicle is already reserved from ${conflict.from} to ${conflict.to}.`;
      alertEl.style.display = 'block';
      return;
    }

    const v = db.vehicles.find(x => x.id === b.vehicleId);
    const days = Math.ceil((new Date(newTo) - new Date(newFrom)) / (1000 * 60 * 60 * 24));
    b.from = newFrom;
    b.to = newTo;
    b.days = days;
    b.amount = (v ? v.price : 3500) * days;
    logAudit('BOOKING_RESCHEDULE', 'Booking', `Booking #${b.id} rescheduled to ${newFrom} - ${newTo}`);
    save();
    closeModal();
    toast('Booking rescheduled successfully!', 'ok');
    loadPage('u_bookings');
  });
}

function cancelBooking(id) {
  const b = db.bookings.find(x => x.id === id);
  if (b) {
    b.status = 'cancelled';
    logAudit('BOOKING_CANCEL', 'Booking', `Booking #${b.id} cancelled by customer`);
    save();
    toast('Booking cancelled.', 'ok');
    loadPage('u_bookings');
  }
}

// ---------------------------------------------------------------------
// DIGITAL PAYMENTS & PDF TAX INVOICES
// ---------------------------------------------------------------------

function u_payment() {
  const paidBookingIds = (db.payments || []).filter(p => p.userId === currentUser.id && (p.status === 'approved' || p.status === 'pending')).map(p => p.bookingId);
  const payableBookings = (db.bookings || []).filter(b => b.userId === currentUser.id && b.status !== 'cancelled' && !paidBookingIds.includes(b.id));

  return `
    <div class="page-title">Digital Payments</div>
    <div class="page-sub">Pay securely via bKash, Nagad, Rocket, Cards or Bank Transfer with instant verifiable invoice generation</div>

    <div class="section-card">
      <h3>Submit Digital Payment</h3>
      ${payableBookings.length === 0 ? '<p style="color:var(--muted);font-size:.85rem;">All active bookings have been paid for or none pending payment.</p>' : `
        <label>Select Booking to Pay For</label>
        <select id="payBookingSelect">
          ${payableBookings.map(b => `<option value="${b.id}">#${b.id} - ${b.vehicleName} (${b.from} to ${b.to}) — ৳${b.amount.toLocaleString()}</option>`).join('')}
        </select>
        
        <label>Select Payment Gateway</label>
        <select id="payGateway">
          <option value="bKash">bKash Merchant Pay (01711-889900)</option>
          <option value="Nagad">Nagad Direct Pay (01722-112233)</option>
          <option value="Rocket">Rocket Mobile Banking</option>
          <option value="Credit Card">Visa / Mastercard Digital</option>
          <option value="Bank Transfer">Direct Bank Transfer</option>
        </select>

        <label>Transaction ID / Digital Reference</label>
        <div style="display:flex;gap:10px;">
          <input type="text" id="payTxnId" placeholder="e.g. BK-98721102">
          <button class="btn btn-ghost btn-sm" type="button" onclick="document.getElementById('payTxnId').value='TXN-'+Math.floor(100000+Math.random()*900000)">Generate Demo TXN</button>
        </div>

        <label>Upload Payment Proof (Optional Screenshot / Reference)</label>
        <input type="file" id="payProofFile" accept="image/*" style="background:#fff;">

        <div style="margin-top:18px;">
          <button class="btn btn-accent" onclick="submitDigitalPayment()">Process Payment →</button>
        </div>
      `}
    </div>

    <div class="section-card">
      <h3>Payment History & Invoices</h3>
      ${(db.payments || []).filter(p => p.userId === currentUser.id).length === 0 ? '<p style="color:var(--muted);">No payment records found.</p>' : `
      <table>
        <tr><th>Vehicle</th><th>Gateway</th><th>TXN ID</th><th>Amount</th><th>Status</th><th>Receipt</th></tr>
        ${db.payments.filter(p => p.userId === currentUser.id).reverse().map(p => `
          <tr>
            <td><strong>${p.vehicleName}</strong></td>
            <td>${p.method}</td>
            <td><code>${p.txn}</code></td>
            <td>৳${p.amount.toLocaleString()}</td>
            <td><span class="badge badge-${p.status}">${p.status}</span></td>
            <td>
              <button class="btn btn-ghost btn-sm" onclick="viewReceipt(${p.id})">📄 Receipt</button>
            </td>
          </tr>
        `).join('')}
      </table>`}
    </div>
  `;
}

function submitDigitalPayment() {
  const bId = parseInt(document.getElementById('payBookingSelect').value);
  const method = document.getElementById('payGateway').value;
  const txn = document.getElementById('payTxnId').value.trim();

  if (!txn) {
    toast('Please enter transaction ID', 'err');
    return;
  }

  const booking = db.bookings.find(b => b.id === bId);
  if (!booking) return;

  const payment = {
    id: genId(),
    bookingId: booking.id,
    userId: currentUser.id,
    vehicleName: booking.vehicleName,
    method,
    txn,
    amount: booking.amount,
    status: 'approved',
    createdAt: new Date().toISOString()
  };

  db.payments.push(payment);
  booking.status = 'approved';
  addNotif('admin', 'Payment Received', `${currentUser.name} paid ৳${booking.amount} via ${method}.`);
  logAudit('PAYMENT_SUBMIT', 'Payment', `Payment of ৳${booking.amount} submitted via ${method} by ${currentUser.name}`);
  save();
  toast('Payment verified! Booking confirmed.', 'ok');
  loadPage('u_payment');
}

function printInvoice(bId) {
  const b = db.bookings.find(x => x.id === bId);
  if (!b) return;
  const p = (db.payments || []).find(x => x.bookingId === b.id && x.status === 'approved');
  const v = db.vehicles.find(x => x.id === b.vehicleId);

  const subtotal = Math.round(b.amount / 1.05);
  const vat = b.amount - subtotal;

  openModal(`Official Rental Tax Invoice`, '', `
    <div class="invoice-card" id="printableInvoice">
      <div class="invoice-header">
        <div>
          <div style="font-family:'Syne',sans-serif;font-size:1.3rem;font-weight:800;color:var(--accent);">🚗 VRMS Platform</div>
          <div style="font-size:.78rem;color:var(--muted);">Vehicle Rental Management System (Bangladesh)</div>
        </div>
        <div style="text-align:right;">
          <div style="font-weight:700;font-size:.9rem;">INVOICE #INV-${b.id}</div>
          <div style="font-size:.76rem;color:var(--muted);">Date: ${new Date().toLocaleDateString()}</div>
        </div>
      </div>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:14px;font-size:.82rem;">
        <div>
          <strong>Billed To:</strong><br>
          ${currentUser.name}<br>
          Phone: ${currentUser.phone || '01700000000'}<br>
          Email: ${currentUser.email}
        </div>
        <div style="text-align:right;">
          <strong>Rental Details:</strong><br>
          Vehicle: ${b.vehicleName}<br>
          Reg No: ${v?.regNo || 'Verified'}<br>
          Hub: ${b.pickupLoc || 'Banani Hub'}
        </div>
      </div>

      <div class="invoice-row"><span>Rental Duration (${b.days} days @ ৳${v ? v.price : 3500}/day):</span><span>৳${subtotal.toLocaleString()}</span></div>
      <div class="invoice-row"><span>Government VAT (5%):</span><span>৳${vat.toLocaleString()}</span></div>
      <div class="invoice-row"><span>Payment Gateway:</span><span>${p ? p.method : 'Digital Pay'}</span></div>
      <div class="invoice-row"><span>Transaction ID:</span><span><code>${p ? p.txn : 'TXN-CONFIRMED'}</code></span></div>
      
      <div class="invoice-total">
        <span>Total Paid:</span>
        <span>৳${b.amount.toLocaleString()}</span>
      </div>

      <div style="margin-top:16px;font-size:.72rem;color:var(--muted);border-top:1px solid var(--border);padding-top:8px;">
        * This is a computer-generated tax invoice and legally binding vehicle rental agreement. Driver and passenger must follow road safety regulations.
      </div>
    </div>
  `, () => {
    window.print();
  });
}

function viewReceipt(pid) {
  const p = db.payments.find(x => x.id === pid);
  if (!p) return;
  const b = db.bookings.find(x => x.id === p.bookingId);
  printInvoice(b ? b.id : p.bookingId);
}

// ---------------------------------------------------------------------
// LIVE TRIP TRACKER
// ---------------------------------------------------------------------

function u_live() {
  const liveTrip = (db.bookings || []).find(b => b.userId === currentUser.id && (b.status === 'active' || b.status === 'approved'));
  const dr = liveTrip ? (db.drivers.find(d => d.id === liveTrip.driverId) || { name: liveTrip.driverName || 'Kamal Hossain', phone: '01819922001', license: 'DL-99120', experience: 4 }) : null;

  if (!liveTrip) {
    return `
      <div class="page-title">Live Trip Tracking</div>
      <div class="page-sub">Real-time route navigation, assigned driver communication, and trip status</div>
      <div class="section-card" style="text-align:center;padding:50px;">
        <div style="font-size:3rem;margin-bottom:12px;">🗺️</div>
        <h3>No Active Rental Trip Right Now</h3>
        <p style="color:var(--muted);font-size:.85rem;margin-top:6px;max-width:420px;margin-left:auto;margin-right:auto;">
          When an approved or active vehicle reservation begins, live telemetry, assigned driver contact details, and trip arrival estimates will appear here automatically.
        </p>
        <button class="btn btn-accent btn-sm" style="margin-top:18px;" onclick="loadPage('u_vehicles')">Book a Vehicle Now</button>
      </div>
    `;
  }

  return `
    <div class="page-title">Live Trip Monitoring 📍</div>
    <div class="page-sub">Trip ID #${liveTrip.id} · Ongoing journey</div>

    <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;">
      <!-- LIVE TRIP STATUS CARD -->
      <div class="section-card">
        <h3>Trip Progress</h3>
        <div style="margin-bottom:16px;">
          <span class="badge ${liveTrip.status==='active'?'badge-active':'badge-approved'}" style="font-size:.85rem;padding:6px 14px;">
            ${liveTrip.status === 'active' ? '🟢 TRIP IN PROGRESS' : '🟡 CONFIRMED - READY FOR DEPARTURE'}
          </span>
        </div>

        <div style="background:var(--surface2);border-radius:10px;padding:14px;margin-bottom:16px;">
          <div style="font-size:.78rem;color:var(--muted);margin-bottom:4px;">ESTIMATED ARRIVAL TIME (ETA)</div>
          <div style="font-size:1.4rem;font-weight:800;color:var(--accent);">~35 Minutes</div>
          <div style="font-size:.76rem;color:var(--success);margin-top:2px;">En route to destination · Normal traffic conditions</div>
        </div>

        <div style="font-size:.86rem;line-height:1.7;">
          <div><strong>Vehicle:</strong> ${liveTrip.vehicleName}</div>
          <div><strong>Pickup Hub:</strong> 📍 ${liveTrip.pickupLoc || 'Banani'}</div>
          <div><strong>Drop-off Hub:</strong> 🏁 ${liveTrip.dropLoc || 'Dhanmondi'}</div>
          <div><strong>Rental Dates:</strong> ${liveTrip.from} to ${liveTrip.to}</div>
        </div>

        <div style="margin-top:18px;display:flex;gap:10px;">
          <button class="btn btn-danger btn-sm" onclick="openEmergencySupportModal(${liveTrip.id})">🚨 Emergency SOS</button>
          <button class="btn btn-ghost btn-sm" onclick="toast('Live route refreshed.', 'ok')">🔄 Refresh Telemetry</button>
        </div>
      </div>

      <!-- ASSIGNED DRIVER CARD -->
      <div class="section-card">
        <h3>Assigned Chauffeur / Driver</h3>
        <div style="display:flex;align-items:center;gap:14px;margin-bottom:16px;background:var(--surface2);padding:14px;border-radius:12px;">
          <div class="user-avatar av-driver" style="width:52px;height:52px;font-size:1.4rem;">👨‍✈️</div>
          <div>
            <div style="font-weight:800;font-size:1.05rem;">${dr.name}</div>
            <div style="font-size:.78rem;color:var(--muted);">Professional Fleet Driver · ${dr.experience || 3} Yrs Exp</div>
            <div style="font-size:.8rem;color:#eab308;font-weight:700;margin-top:2px;">★ 4.9 Passenger Rating</div>
          </div>
        </div>

        <div style="font-size:.84rem;line-height:1.7;margin-bottom:18px;">
          <div><strong>License No:</strong> <code>${dr.license || 'DL-88210'}</code></div>
          <div><strong>Contact Phone:</strong> ${dr.phone || '01711-000000'}</div>
          <div><strong>Verification:</strong> <span style="color:var(--success);font-weight:700;">✓ Background Checked</span></div>
        </div>

        <div style="display:flex;gap:10px;">
          <a href="tel:${dr.phone || '01700000000'}" class="btn btn-accent btn-sm" style="text-decoration:none;">📞 Call Driver</a>
          <button class="btn btn-outline btn-sm" onclick="toast('SMS notification sent to driver: Passenger has shared current location.', 'ok')">💬 Send SMS Note</button>
        </div>
      </div>
    </div>
  `;
}

// ---------------------------------------------------------------------
// NOTIFICATIONS, FAVORITES, REVIEWS & PROFILE
// ---------------------------------------------------------------------

function u_notifications() {
  const notifs = (db.notifications || []).filter(n => n.to === currentUser.id || n.to === 'all' || n.to === 'user');
  const anns = (db.announcements || []).filter(a => a.target_role === 'all' || a.target_role === 'user');

  return `
    <div class="page-title">Notifications & Announcements</div>
    <div class="page-sub">Booking updates, payment confirmations, driver notifications, and platform announcements</div>

    <div class="section-card">
      <h3>System Announcements</h3>
      ${anns.length === 0 ? '<p style="color:var(--muted);">No announcements.</p>' : `
        <div style="display:flex;flex-direction:column;gap:10px;">
          ${anns.map(a => `
            <div style="padding:12px;background:rgba(37,99,235,.04);border-left:4px solid var(--accent);border-radius:4px 8px 8px 4px;">
              <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:3px;">
                <strong style="font-size:.9rem;color:var(--accent);">📢 ${a.title}</strong>
                <span class="badge badge-approved">${a.category || 'General'}</span>
              </div>
              <p style="font-size:.82rem;color:var(--text);margin:0;">${a.message}</p>
            </div>
          `).join('')}
        </div>
      `}
    </div>

    <div class="section-card">
      <h3>Activity Alerts</h3>
      ${notifs.length === 0 ? '<p style="color:var(--muted);">No personal notifications.</p>' : `
        <div style="display:flex;flex-direction:column;gap:8px;">
          ${[...notifs].reverse().map(n => `
            <div style="padding:10px 14px;background:var(--surface2);border-radius:8px;font-size:.83rem;display:flex;justify-content:space-between;">
              <div><strong>${n.title}</strong> — ${n.body || n.message}</div>
              <span style="font-size:.72rem;color:var(--muted);">${new Date(n.date || Date.now()).toLocaleDateString()}</span>
            </div>
          `).join('')}
        </div>
      `}
    </div>
  `;
}

function u_favorites() {
  const favs = (db.favorites || []).filter(f => f.userId === currentUser.id);
  const vehicles = (db.vehicles || []).filter(v => favs.some(f => f.vehicleId === v.id));

  return `
    <div class="page-title">My Favorite Vehicles ❤️</div>
    <div class="page-sub">Bookmarked cars for quick reservation and instant rate tracking</div>

    <div class="vehicles-grid">
      ${vehicles.length === 0 ? `
        <div style="grid-column:1/-1;text-align:center;padding:50px;background:var(--surface);border-radius:14px;border:1px solid var(--border);">
          <div style="font-size:3rem;margin-bottom:10px;">🤍</div>
          <h3>Your wishlist is empty</h3>
          <p style="color:var(--muted);font-size:.85rem;margin-top:6px;">Click the heart icon on any vehicle card in the catalog to bookmark it here.</p>
          <button class="btn btn-accent btn-sm" style="margin-top:16px;" onclick="loadPage('u_vehicles')">Browse Catalog</button>
        </div>
      ` : vehicles.map(v => `
        <div class="v-card">
          <div class="v-card-img">
            <span class="v-card-loc">📍 ${v.location}</span>
            <button class="fav-btn active" onclick="toggleFavorite(${v.id}, event)" title="Remove">❤️</button>
            ${v.img}
          </div>
          <div class="v-card-body">
            <h4>${v.name}</h4>
            <div class="vtype">${v.type} · ${v.seats} seats · ${v.fuel}</div>
            <div class="price">৳${v.price.toLocaleString()}<span>/day</span></div>
          </div>
          <div class="v-card-footer">
            <button class="btn btn-accent btn-sm btn-full" onclick="openBookModal(${v.id})">Book Now</button>
          </div>
        </div>
      `).join('')}
    </div>
  `;
}

function u_reviews() {
  const myReviews = (db.reviews || []).filter(r => r.userId === currentUser.id);
  const unreviewedCompleted = (db.bookings || []).filter(b => b.userId === currentUser.id && b.status === 'completed' && !hasReviewed(b.id));

  return `
    <div class="page-title">Reviews & Trip Ratings</div>
    <div class="page-sub">Feedback submitted for vehicles and professional drivers</div>

    ${unreviewedCompleted.length > 0 ? `
      <div class="section-card" style="border-color:var(--accent);">
        <h3 style="color:var(--accent);">⭐ Completed Trips Waiting for Review</h3>
        <p style="font-size:.84rem;color:var(--muted);margin-bottom:12px;">Share your experience to help the community and reward top-rated drivers.</p>
        ${unreviewedCompleted.map(b => `
          <div style="display:flex;justify-content:space-between;align-items:center;padding:10px;background:var(--surface2);border-radius:8px;margin-bottom:8px;">
            <div><strong>${b.vehicleName}</strong> (${b.from} to ${b.to}) — Driver: ${b.driverName || 'Assigned Driver'}</div>
            <button class="btn btn-accent btn-sm" onclick="openReviewModal(${b.id})">Review Now</button>
          </div>
        `).join('')}
      </div>
    ` : ''}

    <div class="section-card">
      <h3>My Submitted Reviews (${myReviews.length})</h3>
      ${myReviews.length === 0 ? '<p style="color:var(--muted);">No reviews posted yet.</p>' : `
        ${myReviews.map(r => `
          <div class="review-item">
            <div class="review-header">
              <span>Trip #${r.bookingId} · ${r.date}</span>
              <span style="color:#eab308;">Vehicle: ${'★'.repeat(r.vehicleRating)} | Driver: ${'★'.repeat(r.driverRating || 5)}</span>
            </div>
            <div style="font-size:.82rem;"><strong>Vehicle Comment:</strong> ${r.vehicleComment || 'Good condition.'}</div>
            <div style="font-size:.82rem;margin-top:3px;"><strong>Driver Comment:</strong> ${r.driverComment || 'Safe and polite.'}</div>
          </div>
        `).join('')}
      `}
    </div>
  `;
}

function u_profile() {
  const isVerified = currentUser.verification_status === 'verified';

  return `
    <div class="page-title">My Profile & Verification</div>
    <div class="page-sub">Manage your personal credentials, identity documents, and saved hubs</div>

    <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;">
      <div class="section-card">
        <h3>Personal Credentials</h3>
        <div style="margin-bottom:14px;">
          <span class="badge ${isVerified?'badge-active':'badge-pending'}" style="padding:5px 12px;font-size:.78rem;">
            ${isVerified ? '✓ Verified Customer' : '🟡 Verification Pending'}
          </span>
        </div>

        <label style="margin-top:0;">Full Name</label>
        <input type="text" id="profName" value="${currentUser.name}">
        <label>Email Address</label>
        <input type="email" value="${currentUser.email}" disabled style="opacity:.7;">
        <label>Phone Number</label>
        <input type="tel" id="profPhone" value="${currentUser.phone || ''}">

        <div style="margin-top:18px;">
          <button class="btn btn-accent" onclick="saveCustomerProfile()">Update Profile</button>
        </div>
      </div>

      <div class="section-card">
        <h3>Document Verification (NID / License)</h3>
        <p style="font-size:.82rem;color:var(--muted);margin-bottom:12px;">Upload National ID card or Driving License to unlock instant booking approval.</p>
        
        <label style="margin-top:0;">Upload NID or Driving License</label>
        <input type="file" id="nidUpload" accept="image/*" onchange="previewUpload(this)" style="background:#fff;">
        <div id="uploadPreview" style="font-size:.78rem;color:var(--success);margin-top:6px;font-weight:600;">${isVerified ? '✓ Verified on record' : 'No document submitted'}</div>

        <div style="margin-top:18px;border-top:1px solid var(--border);padding-top:16px;">
          <h4 style="font-size:.9rem;margin-bottom:6px;">Need Assistance?</h4>
          <button class="btn btn-outline btn-sm" onclick="openEmergencySupportModal()">🚨 File Support Ticket / Complaint</button>
        </div>
      </div>
    </div>
  `;
}

function previewUpload(input) {
  if (input.files && input.files[0]) {
    document.getElementById('uploadPreview').textContent = '📄 ' + input.files[0].name + ' (Uploaded for verification)';
    currentUser.verification_status = 'pending';
    toast('Document uploaded! Awaiting administrator review.', 'ok');
    save();
  }
}

function openEmergencySupportModal(bId = null) {
  openModal('Help Center & Support Desk', '', `
    <label style="margin-top:0;">Subject / Incident Category</label>
    <select id="supSubject">
      <option>Vehicle Delay / Breakdown Support</option>
      <option>Driver Conduct / Route Dispute</option>
      <option>Payment Verification Query</option>
      <option>Booking Modification Request</option>
      <option>Other Emergency Assistance</option>
    </select>
    <label>Detailed Message</label>
    <textarea id="supDesc" placeholder="Please describe the issue or emergency in detail..." style="min-height:90px;"></textarea>
  `, () => {
    const subj = document.getElementById('supSubject').value;
    const desc = document.getElementById('supDesc').value.trim();
    if (!desc) return toast('Please describe the problem', 'err');

    if (!db.complaints) db.complaints = [];
    db.complaints.push({
      id: genId(),
      userId: currentUser.id,
      roleType: 'customer',
      bookingId: bId,
      subject: subj,
      description: desc,
      status: 'open',
      createdAt: new Date().toISOString()
    });

    addNotif('admin', 'New Customer Complaint Filed', `${currentUser.name} reported: ${subj}`);
    logAudit('COMPLAINT_FILED', 'Complaint', `Support ticket filed by ${currentUser.name}: ${subj}`);
    save();
    closeModal();
    toast('Support ticket submitted! Support desk has been notified.', 'ok');
  });
}


// =====================================================================
// 👨‍✈️ DRIVER MODULE
// =====================================================================

function getMyDriverProfile() {
  let dr = (db.drivers || []).find(d => d.userId === currentUser.id);
  if (!dr) {
    dr = { id: genId(), userId: currentUser.id, name: currentUser.name, phone: currentUser.phone || '01711223344', license: 'DL-99120', status: 'active', experience: 3, verification_status: 'verified' };
    if (!db.drivers) db.drivers = [];
    db.drivers.push(dr);
    save();
  }
  return dr;
}

function setDriverDuty(status) {
  const dr = getMyDriverProfile();
  dr.status = status;
  dr.driver_status = status;
  logAudit('DRIVER_DUTY_CHANGE', 'Driver', `Driver ${dr.name} set duty status to ${status}`);
  save();
  toast(`Duty status updated to: ${status.toUpperCase()}`, 'ok');
  loadPage('d_home');
}

function d_home() {
  const dr = getMyDriverProfile();
  const assigned = (db.bookings || []).filter(b => b.driverId === dr.id || b.driverName === dr.name);
  const activeTrips = assigned.filter(b => b.status === 'active' || b.status === 'approved').length;
  const completed = assigned.filter(b => b.status === 'completed').length;
  const avgRating = getDriverAvgRating(dr.id);
  const reviewsCount = getDriverReviews(dr.id).length;

  const curStatus = dr.status || 'active';

  return `
    <div class="page-title">Driver Control Center 👨‍✈️</div>
    <div class="page-sub">Logged in as <strong>${dr.name}</strong> · License: ${dr.license}</div>

    <!-- DUTY STATUS SWITCHER -->
    <div class="section-card" style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px;">
      <div>
        <div style="font-weight:700;font-size:.95rem;">Live Availability & Duty Status</div>
        <div style="font-size:.78rem;color:var(--muted);">Toggle your status to receive new passenger trip dispatching.</div>
      </div>
      <div class="duty-switch">
        <button class="duty-btn ${curStatus==='active'?'active on-duty':''}" onclick="setDriverDuty('active')">🟢 On Duty (Ready)</button>
        <button class="duty-btn ${curStatus==='on_trip'?'active on-trip':''}" onclick="setDriverDuty('on_trip')">🟡 On Active Trip</button>
        <button class="duty-btn ${curStatus==='on_leave'?'active off-duty':''}" onclick="setDriverDuty('on_leave')">⚪ Off Duty / Leave</button>
      </div>
    </div>

    <!-- STATS -->
    <div class="stats-row">
      <div class="stat-card">
        <div class="label">Assigned Trips</div>
        <div class="value">${assigned.length}</div>
        <div class="change">Total dispatch records</div>
      </div>
      <div class="stat-card">
        <div class="label">Upcoming / Active</div>
        <div class="value" style="color:var(--warning)">${activeTrips}</div>
        <div class="change">Immediate schedules</div>
      </div>
      <div class="stat-card">
        <div class="label">Completed Trips</div>
        <div class="value" style="color:var(--success)">${completed}</div>
        <div class="change">Finished routes</div>
      </div>
      <div class="stat-card">
        <div class="label">Average Rating</div>
        <div class="value" style="color:#eab308">★ ${avgRating}</div>
        <div class="change">${reviewsCount} passenger reviews</div>
      </div>
    </div>

    <!-- ACTIVE SCHEDULES -->
    <div class="section-card">
      <h3>Today's & Upcoming Trip Schedules</h3>
      ${assigned.length === 0 ? '<p style="color:var(--muted);font-size:.85rem;">No trips currently assigned to you.</p>' : `
      <table>
        <tr><th>Vehicle</th><th>Passenger</th><th>Route / Hubs</th><th>Dates</th><th>Status</th><th>Action</th></tr>
        ${assigned.map(b => `
          <tr>
            <td><strong>${b.vehicleName}</strong></td>
            <td>${b.userName}</td>
            <td>${b.pickupLoc || 'Banani'} ➔ ${b.dropLoc || 'Dhanmondi'}</td>
            <td>${b.from} to ${b.to}</td>
            <td><span class="badge badge-${b.status}">${b.status}</span></td>
            <td>
              ${b.status === 'approved' ? `<button class="btn btn-accent btn-sm" onclick="driverStartTrip(${b.id})">Start Trip</button>` : ''}
              ${b.status === 'active' ? `<button class="btn btn-success btn-sm" onclick="driverCompleteTripModal(${b.id})">Finish Trip</button>` : ''}
              ${b.status === 'completed' ? `<span style="color:var(--success);font-size:.8rem;font-weight:700;">✓ Completed</span>` : ''}
            </td>
          </tr>
        `).join('')}
      </table>`}
    </div>
  `;
}

function driverStartTrip(bId) {
  const b = db.bookings.find(x => x.id === bId);
  if (!b) return;

  openModal(`Start Trip #${b.id}`, '', `
    <p style="font-size:.85rem;color:var(--muted);margin-bottom:12px;">
      Beginning journey for <strong>${b.vehicleName}</strong> with passenger <strong>${b.userName}</strong>.
    </p>
    <label style="margin-top:0;">Starting Odometer Reading (KM)</label>
    <input type="number" id="odoStartInput" placeholder="e.g. 45200" min="0">
  `, () => {
    const odo = parseInt(document.getElementById('odoStartInput').value) || 0;
    b.status = 'active';
    b.odometerStart = odo;
    setDriverDuty('on_trip');
    addNotif(b.userId, 'Trip Started!', `Your driver ${currentUser.name} has started the trip in ${b.vehicleName}.`);
    logAudit('TRIP_START', 'Trip', `Trip #${b.id} started with odometer ${odo} km`);
    save();
    closeModal();
    toast('Trip started! Drive safely.', 'ok');
    loadPage('d_trips');
  });
}

function driverCompleteTripModal(bId) {
  const b = db.bookings.find(x => x.id === bId);
  if (!b) return;

  openModal(`Complete Trip #${b.id}`, '', `
    <p style="font-size:.85rem;color:var(--muted);margin-bottom:12px;">
      Finish journey for <strong>${b.vehicleName}</strong>. Please enter the final vehicle odometer reading.
    </p>
    <label style="margin-top:0;">Final Odometer Reading (KM)</label>
    <input type="number" id="odoEndInput" placeholder="e.g. 45350" min="${b.odometerStart || 0}">
  `, () => {
    const odoEnd = parseInt(document.getElementById('odoEndInput').value) || ((b.odometerStart || 45000) + 120);
    b.status = 'completed';
    b.odometerEnd = odoEnd;
    b.totalDistanceKm = odoEnd - (b.odometerStart || odoEnd);
    setDriverDuty('active');
    addNotif(b.userId, 'Trip Completed!', `Your trip has concluded. Please leave a review for driver ${currentUser.name}.`);
    logAudit('TRIP_COMPLETE', 'Trip', `Trip #${b.id} completed. Distance: ${b.totalDistanceKm} km`);
    save();
    closeModal();
    toast('Trip concluded! Passenger notified to submit ratings.', 'ok');
    loadPage('d_trips');
  });
}

function driverAcceptTrip(bId) {
  const b = db.bookings.find(x => x.id === bId);
  if (b) {
    b.driverAccepted = true;
    addNotif(b.userId, 'Trip Confirmed by Driver', `Driver ${currentUser.name} has accepted your trip.`);
    logAudit('TRIP_ACCEPT', 'Driver', `Driver ${currentUser.name} accepted trip #${b.id}`);
    save();
    toast('Trip accepted!', 'ok');
    loadPage('d_trips');
  }
}

function driverRejectTrip(bId) {
  const b = db.bookings.find(x => x.id === bId);
  if (b) {
    b.driverId = null;
    b.driverName = null;
    b.driverAccepted = false;
    addNotif('owner', 'Driver Declined Trip', `Driver ${currentUser.name} declined trip #${b.id}. Please reassign.`);
    logAudit('TRIP_DECLINE', 'Driver', `Driver ${currentUser.name} declined trip #${b.id}`);
    save();
    toast('Trip declined.', 'ok');
    loadPage('d_trips');
  }
}

function d_trips() {
  const dr = getMyDriverProfile();
  const assigned = (db.bookings || []).filter(b => b.driverId === dr.id || b.driverName === dr.name);

  return `
    <div class="page-title">Assigned Trips & Route Guidance</div>
    <div class="page-sub">Manage customer pickup schedules, update odometer telemetry, and inspect route locations</div>

    <div class="section-card">
      ${assigned.length === 0 ? '<p style="color:var(--muted);">No trips assigned yet.</p>' : `
      <table>
        <tr><th>Trip ID</th><th>Vehicle</th><th>Customer</th><th>Route Details</th><th>Dates</th><th>Status</th><th>Actions</th></tr>
        ${assigned.map(b => `
          <tr>
            <td>#${b.id}</td>
            <td><strong>${b.vehicleName}</strong></td>
            <td>${b.userName}</td>
            <td>📍 ${b.pickupLoc || 'Banani'} ➔ 🏁 ${b.dropLoc || 'Dhanmondi'}</td>
            <td>${b.from} to ${b.to}</td>
            <td><span class="badge badge-${b.status}">${b.status}</span></td>
            <td>
              <div style="display:flex;gap:6px;">
                ${b.status === 'approved' && !b.driverAccepted ? `
                  <button class="btn btn-success btn-sm" onclick="driverAcceptTrip(${b.id})">Accept</button>
                  <button class="btn btn-danger btn-sm" onclick="driverRejectTrip(${b.id})">Decline</button>
                ` : ''}
                ${b.status === 'approved' && b.driverAccepted ? `
                  <button class="btn btn-accent btn-sm" onclick="driverStartTrip(${b.id})">Start Trip</button>
                ` : ''}
                ${b.status === 'active' ? `
                  <button class="btn btn-success btn-sm" onclick="driverCompleteTripModal(${b.id})">Complete</button>
                ` : ''}
                ${b.status === 'completed' ? `
                  <span style="font-size:.78rem;color:var(--success);font-weight:700;">✓ Done (${b.totalDistanceKm || 85} km)</span>
                ` : ''}
              </div>
            </td>
          </tr>
        `).join('')}
      </table>`}
    </div>
  `;
}

// ---------------------------------------------------------------------
// FUEL USAGE ENTRY & TRIP LOGGING
// ---------------------------------------------------------------------

function d_fuel() {
  const dr = getMyDriverProfile();
  const logs = (db.fuel_logs || []).filter(fl => fl.driverId === dr.id);
  const myCompletedTrips = (db.bookings || []).filter(b => (b.driverId === dr.id || b.driverName === dr.name) && b.status === 'completed');
  const totalKmDriven = myCompletedTrips.reduce((acc, b) => acc + (b.totalDistanceKm || 0), 0);
  const totalFuelCost = logs.reduce((acc, f) => acc + (f.cost || 0), 0);
  const totalFuelLiters = logs.reduce((acc, f) => acc + (f.liters || 0), 0);

  return `
    <div class="page-title">Fuel & Trip Log ⛽</div>
    <div class="page-sub">Record fuel refills, odometer telemetry, travel records, and fuel receipts</div>

    <div class="stats-row">
      <div class="stat-card">
        <div class="label">Total KM Driven</div>
        <div class="value" style="color:var(--accent)">${totalKmDriven.toLocaleString()} km</div>
        <div class="change">Across ${myCompletedTrips.length} completed trips</div>
      </div>
      <div class="stat-card">
        <div class="label">Total Fuel Logged</div>
        <div class="value" style="color:var(--accent2)">${totalFuelLiters} L</div>
        <div class="change">Liters dispensed</div>
      </div>
      <div class="stat-card">
        <div class="label">Fuel Expense</div>
        <div class="value" style="color:var(--success)">৳${totalFuelCost.toLocaleString()}</div>
        <div class="change">Reimbursable expenses</div>
      </div>
    </div>

    <!-- LOG NEW FUEL -->
    <div class="section-card">
      <h3>⛽ Log New Fuel Purchase</h3>
      <div class="form-grid" style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
        <div>
          <label style="margin-top:0;">Select Vehicle</label>
          <select id="flVehicle">
            ${(db.vehicles || []).map(v => `<option value="${v.id}">${v.name} (${v.fuel})</option>`).join('')}
          </select>
        </div>
        <div>
          <label style="margin-top:0;">Odometer Reading (KM)</label>
          <input type="number" id="flOdo" placeholder="e.g. 45280" min="0">
        </div>
        <div>
          <label style="margin-top:0;">Fuel Liters</label>
          <input type="number" id="flLiters" placeholder="e.g. 30" step="0.5" min="1" oninput="calcFuelCost()">
        </div>
        <div>
          <label style="margin-top:0;">Total Cost (৳)</label>
          <input type="number" id="flCost" placeholder="e.g. 3900" min="10">
        </div>
        <div>
          <label style="margin-top:0;">Fuel Station Name</label>
          <input type="text" id="flStation" placeholder="e.g. Meghna Petroleum, Banani">
        </div>
        <div>
          <label style="margin-top:0;">Upload Fuel Receipt (Optional)</label>
          <input type="file" id="flReceipt" accept="image/*" style="background:#fff;">
        </div>
      </div>
      <div style="margin-top:16px;">
        <button class="btn btn-accent" onclick="submitFuelLog()">Save Fuel Log</button>
      </div>
    </div>

    <!-- FUEL HISTORY & TRAVEL RECORDS -->
    <div class="section-card">
      <h3>Fuel Logs & Travel Mileage History</h3>
      ${logs.length === 0 ? '<p style="color:var(--muted);">No fuel logs recorded yet.</p>' : `
      <table>
        <tr><th>Date</th><th>Vehicle</th><th>Odometer</th><th>Liters</th><th>Cost</th><th>Station</th><th>Receipt</th></tr>
        ${[...logs].reverse().map(fl => `
          <tr>
            <td>${fl.date}</td>
            <td><strong>${fl.vehicleName}</strong></td>
            <td>${fl.odometer} km</td>
            <td>${fl.liters} L</td>
            <td>৳${fl.cost.toLocaleString()}</td>
            <td>${fl.station || 'Local Station'}</td>
            <td><span class="badge badge-active">✓ Attached</span></td>
          </tr>
        `).join('')}
      </table>`}
    </div>
  `;
}

function calcFuelCost() {
  const lit = parseFloat(document.getElementById('flLiters')?.value) || 0;
  const costEl = document.getElementById('flCost');
  if (costEl && !costEl.value && lit > 0) {
    costEl.value = Math.round(lit * 130);
  }
}

function submitFuelLog() {
  const vId = parseInt(document.getElementById('flVehicle').value);
  const odo = parseInt(document.getElementById('flOdo').value) || 0;
  const lit = parseFloat(document.getElementById('flLiters').value) || 0;
  const cost = parseFloat(document.getElementById('flCost').value) || 0;
  const station = document.getElementById('flStation').value.trim() || 'City Fuel Station';

  if (lit <= 0 || cost <= 0) return toast('Please enter liters and total cost', 'err');

  const v = db.vehicles.find(x => x.id === vId);
  const dr = getMyDriverProfile();

  if (!db.fuel_logs) db.fuel_logs = [];
  db.fuel_logs.push({
    id: genId(),
    vehicleId: vId,
    vehicleName: v ? v.name : 'Fleet Car',
    driverId: dr.id,
    driverName: dr.name,
    date: new Date().toISOString().split('T')[0],
    odometer: odo,
    liters: lit,
    cost: cost,
    station: station
  });

  logAudit('FUEL_LOG', 'Fuel', `Driver ${dr.name} logged ${lit}L (৳${cost}) for ${v?.name}`);
  save();
  toast('Fuel purchase logged successfully!', 'ok');
  loadPage('d_fuel');
}

// ---------------------------------------------------------------------
// DRIVER EARNINGS & ALLOWANCES
// ---------------------------------------------------------------------

function d_earnings() {
  const dr = getMyDriverProfile();
  const completedTrips = (db.bookings || []).filter(b => (b.driverId === dr.id || b.driverName === dr.name) && b.status === 'completed');
  
  // Daily driver allowance = ৳500 per trip day
  const tripAllowanceTotal = completedTrips.reduce((acc, b) => acc + (b.days * 500), 0);
  const fuelReimbursements = (db.fuel_logs || []).filter(f => f.driverId === dr.id).reduce((acc, f) => acc + f.cost, 0);
  const totalPayout = tripAllowanceTotal + fuelReimbursements;

  return `
    <div class="page-title">Driver Earnings & Allowances 💰</div>
    <div class="page-sub">Transparent summary of daily driver duty allowances, completed trips, and fuel reimbursements</div>

    <div class="stats-row">
      <div class="stat-card">
        <div class="label">Total Driver Payout</div>
        <div class="value" style="color:var(--accent)">৳${totalPayout.toLocaleString()}</div>
        <div class="change">Allowance + Fuel Reimbursed</div>
      </div>
      <div class="stat-card">
        <div class="label">Trip Allowances</div>
        <div class="value" style="color:var(--success)">৳${tripAllowanceTotal.toLocaleString()}</div>
        <div class="change">৳500 / day base pay</div>
      </div>
      <div class="stat-card">
        <div class="label">Fuel Reimbursement</div>
        <div class="value" style="color:var(--accent2)">৳${fuelReimbursements.toLocaleString()}</div>
        <div class="change">Approved gas station expenses</div>
      </div>
      <div class="stat-card">
        <div class="label">Completed Trips</div>
        <div class="value">${completedTrips.length}</div>
        <div class="change">Eligible for payouts</div>
      </div>
    </div>

    <div class="section-card">
      <h3>Trip Payout Breakdown</h3>
      ${completedTrips.length === 0 ? '<p style="color:var(--muted);">No completed trips on record for earnings calculation.</p>' : `
      <table>
        <tr><th>Trip ID</th><th>Vehicle</th><th>Customer</th><th>Duration</th><th>Daily Allowance</th><th>Total Payout</th></tr>
        ${completedTrips.map(b => `
          <tr>
            <td>#${b.id}</td>
            <td><strong>${b.vehicleName}</strong></td>
            <td>${b.userName}</td>
            <td>${b.days} days (${b.from} to ${b.to})</td>
            <td>৳500 / day</td>
            <td><strong>৳${(b.days * 500).toLocaleString()}</strong></td>
          </tr>
        `).join('')}
      </table>`}
    </div>
  `;
}

// ---------------------------------------------------------------------
// DRIVER LEAVE & WORKING SCHEDULE
// ---------------------------------------------------------------------

function d_leave() {
  const dr = getMyDriverProfile();
  const leaves = (db.leaves || []).filter(l => l.driverId === dr.id);

  return `
    <div class="page-title">Leave & Working Schedule 📅</div>
    <div class="page-sub">Submit vacation/sick leave requests, inspect working calendar, and adjust shift status</div>

    <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;">
      <div class="section-card">
        <h3>Apply for Leave</h3>
        <label style="margin-top:0;">Start Date</label>
        <input type="date" id="leaveStart" min="${new Date().toISOString().split('T')[0]}">
        <label>End Date</label>
        <input type="date" id="leaveEnd" min="${new Date().toISOString().split('T')[0]}">
        <label>Reason for Leave</label>
        <textarea id="leaveReason" placeholder="e.g. Medical emergency, family function, annual vacation..." style="min-height:70px;"></textarea>

        <div style="margin-top:16px;">
          <button class="btn btn-accent" onclick="submitLeaveRequest()">Submit Leave Application</button>
        </div>
      </div>

      <div class="section-card">
        <h3>Leave Application History</h3>
        ${leaves.length === 0 ? '<p style="color:var(--muted);">No leave applications filed.</p>' : `
        <table>
          <tr><th>Dates</th><th>Reason</th><th>Status</th></tr>
          ${leaves.map(l => `
            <tr>
              <td>${l.startDate} to ${l.endDate}</td>
              <td>${l.reason}</td>
              <td><span class="badge badge-${l.status==='approved'?'active':l.status==='rejected'?'cancelled':'pending'}">${l.status}</span></td>
            </tr>
          `).join('')}
        </table>`}
      </div>
    </div>
  `;
}

function submitLeaveRequest() {
  const s = document.getElementById('leaveStart').value;
  const e = document.getElementById('leaveEnd').value;
  const r = document.getElementById('leaveReason').value.trim();

  if (!s || !e || !r) return toast('Please fill in all leave fields', 'err');
  if (e < s) return toast('End date cannot be earlier than start date', 'err');

  const dr = getMyDriverProfile();
  if (!db.leaves) db.leaves = [];
  db.leaves.push({
    id: genId(),
    driverId: dr.id,
    driverName: dr.name,
    startDate: s,
    endDate: e,
    reason: r,
    status: 'pending',
    appliedAt: new Date().toISOString()
  });

  addNotif('admin', 'New Driver Leave Request', `Driver ${dr.name} requested leave from ${s} to ${e}`);
  logAudit('LEAVE_REQUEST', 'Driver', `Leave requested by ${dr.name}: ${s} to ${e}`);
  save();
  toast('Leave application submitted for approval.', 'ok');
  loadPage('d_leave');
}

// ---------------------------------------------------------------------
// DRIVER NOTIFICATIONS, RATINGS & PROFILE
// ---------------------------------------------------------------------

function d_notifications() {
  const notifs = (db.notifications || []).filter(n => n.to === currentUser.id || n.to === 'all' || n.to === 'driver');
  const anns = (db.announcements || []).filter(a => a.target_role === 'all' || a.target_role === 'driver');

  return `
    <div class="page-title">Driver Notifications</div>
    <div class="page-sub">Assignment dispatches, leave updates, and fleet announcements</div>

    <div class="section-card">
      <h3>Announcements</h3>
      ${anns.map(a => `
        <div style="padding:12px;background:rgba(139,92,246,.06);border-left:4px solid var(--accent4);border-radius:4px 8px 8px 4px;margin-bottom:8px;">
          <strong>📢 ${a.title}</strong>
          <p style="font-size:.82rem;margin:4px 0 0;">${a.message}</p>
        </div>
      `).join('')}
    </div>

    <div class="section-card">
      <h3>Dispatch Alerts</h3>
      ${notifs.map(n => `
        <div style="padding:10px 14px;background:var(--surface2);border-radius:8px;font-size:.83rem;margin-bottom:6px;">
          <strong>${n.title}</strong> — ${n.body || n.message}
        </div>
      `).join('')}
    </div>
  `;
}

function d_ratings() {
  const dr = getMyDriverProfile();
  const reviews = getDriverReviews(dr.id);
  const avg = getDriverAvgRating(dr.id);

  return `
    <div class="page-title">Passenger Ratings & Reviews ⭐</div>
    <div class="page-sub">Overall rating: <strong>★ ${avg} / 5.0</strong> based on ${reviews.length} passenger evaluations</div>

    <div class="section-card">
      <h3>Passenger Feedback Log</h3>
      ${reviews.length === 0 ? '<p style="color:var(--muted);">No reviews received yet.</p>' : `
        ${reviews.map(r => `
          <div class="review-item">
            <div class="review-header">
              <span>${r.userName || 'Passenger'}</span>
              <span style="color:#eab308;">${'★'.repeat(r.driverRating || 5)} (${r.driverRating || 5}/5)</span>
            </div>
            <div>${r.driverComment || 'Great driving experience.'}</div>
            <div style="font-size:.72rem;color:var(--muted);margin-top:4px;">Trip #${r.bookingId} · ${r.date}</div>
          </div>
        `).join('')}
      `}
    </div>
  `;
}

function d_profile() {
  const dr = getMyDriverProfile();
  const isVerified = dr.verification_status === 'verified';

  return `
    <div class="page-title">Driver Profile & Credentials</div>
    <div class="page-sub">Manage your professional driver profile, license, and verification documents</div>

    <div class="section-card" style="max-width:550px;">
      <div style="display:flex;align-items:center;gap:14px;margin-bottom:16px;">
        <div class="user-avatar av-driver" style="width:52px;height:52px;font-size:1.4rem;">👨‍✈️</div>
        <div>
          <div style="font-weight:700;font-size:1.05rem;">${dr.name}</div>
          <div style="font-size:.78rem;color:var(--muted);">Status: <span class="badge ${isVerified?'badge-active':'badge-pending'}">${isVerified?'Verified Driver':'Pending Verification'}</span></div>
        </div>
      </div>

      <label style="margin-top:0;">Full Name</label>
      <input type="text" id="drProfName" value="${dr.name}">
      <label>Contact Phone</label>
      <input type="tel" id="drProfPhone" value="${dr.phone}">
      <label>Driving License Number</label>
      <input type="text" id="drProfLic" value="${dr.license}">
      <label>Years of Professional Experience</label>
      <input type="number" id="drProfExp" value="${dr.experience || 3}" min="1">

      <div style="margin-top:18px;">
        <button class="btn btn-accent" onclick="saveDriverProfile()">Save Credentials</button>
      </div>
    </div>
  `;
}

function saveDriverProfile() {
  const dr = getMyDriverProfile();
  dr.name = document.getElementById('drProfName').value.trim();
  dr.phone = document.getElementById('drProfPhone').value.trim();
  dr.license = document.getElementById('drProfLic').value.trim();
  dr.experience = parseInt(document.getElementById('drProfExp').value) || 3;
  currentUser.name = dr.name;
  currentUser.phone = dr.phone;
  save();
  sessionStorage.setItem('vrms_user', JSON.stringify(currentUser));
  toast('Driver credentials saved!', 'ok');
  loadPage('d_profile');
}


// =====================================================================
// 🚗 FLEET OWNER MODULE
// =====================================================================

function o_home() {
  const myVehicles = (db.vehicles || []).filter(v => v.owner === currentUser.id);
  const myVehIds = myVehicles.map(v => v.id);
  const requests = (db.bookings || []).filter(b => myVehIds.includes(b.vehicleId));
  const available = myVehicles.filter(v => v.status === 'available').length;
  const activeRentals = requests.filter(b => b.status === 'active').length;
  const pending = requests.filter(b => b.status === 'pending').length;
  const estRev = requests.filter(b => b.status !== 'cancelled').reduce((acc, b) => acc + b.amount, 0);

  return `
    <div class="page-title">Fleet Owner Dashboard 🚗</div>
    <div class="page-sub">Manage fleet inventory, booking approvals, driver assignments, and document compliance</div>

    <!-- STATS -->
    <div class="stats-row">
      <div class="stat-card">
        <div class="label">Total Fleet Size</div>
        <div class="value">${myVehicles.length}</div>
        <div class="change">Listed vehicles</div>
      </div>
      <div class="stat-card">
        <div class="label">Available Now</div>
        <div class="value" style="color:var(--success)">${available}</div>
        <div class="change">Ready for booking</div>
      </div>
      <div class="stat-card">
        <div class="label">Active Rentals</div>
        <div class="value" style="color:var(--accent)">${activeRentals}</div>
        <div class="change">Currently on trip</div>
      </div>
      <div class="stat-card">
        <div class="label">Pending Requests</div>
        <div class="value" style="color:var(--warning)">${pending}</div>
        <div class="change">Awaiting your approval</div>
      </div>
      <div class="stat-card">
        <div class="label">Total Revenue</div>
        <div class="value" style="color:var(--accent2)">৳${estRev.toLocaleString()}</div>
        <div class="change">Fleet earnings</div>
      </div>
    </div>

    <!-- RECENT INQUIRIES -->
    <div class="section-card">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;">
        <h3 style="margin-bottom:0;">Pending Booking Inquiries</h3>
        <button class="btn btn-accent btn-sm" onclick="openAddVehicleModal()">+ Add Vehicle</button>
      </div>
      ${requests.filter(b => b.status === 'pending').length === 0 ? '<p style="color:var(--muted);font-size:.85rem;">No pending booking inquiries right now.</p>' : `
      <table>
        <tr><th>Customer</th><th>Vehicle</th><th>Dates</th><th>Total Amount</th><th>Actions</th></tr>
        ${requests.filter(b => b.status === 'pending').map(b => `
          <tr>
            <td><strong>${b.userName}</strong></td>
            <td>${b.vehicleName}</td>
            <td>${b.from} to ${b.to} (${b.days}d)</td>
            <td>৳${b.amount.toLocaleString()}</td>
            <td>
              <div style="display:flex;gap:6px;">
                <button class="btn btn-success btn-sm" onclick="ownerApprove(${b.id})">Approve</button>
                <button class="btn btn-outline btn-sm" onclick="openAssignDriverModal(${b.id})">👨‍✈️ Assign Driver</button>
                <button class="btn btn-danger btn-sm" onclick="ownerReject(${b.id})">Reject</button>
              </div>
            </td>
          </tr>
        `).join('')}
      </table>`}
    </div>
  `;
}

// ---------------------------------------------------------------------
// MY FLEET & VEHICLE MANAGEMENT
// ---------------------------------------------------------------------

function o_vehicles() {
  const mine = (db.vehicles || []).filter(v => v.owner === currentUser.id);

  return `
    <div class="page-title">My Fleet Inventory</div>
    <div class="page-sub">Add, configure, and monitor rental vehicles across all city hubs</div>

    <div style="margin-bottom:18px;">
      <button class="btn btn-accent" onclick="openAddVehicleModal()">+ Add New Vehicle</button>
    </div>

    <div class="vehicles-grid">
      ${mine.length === 0 ? `
        <div style="grid-column:1/-1;text-align:center;padding:50px;background:var(--surface);border-radius:14px;border:1px solid var(--border);">
          <div style="font-size:3rem;margin-bottom:10px;">🚗</div>
          <h3>No vehicles listed under your account</h3>
          <p style="color:var(--muted);font-size:.85rem;margin-top:6px;">Add your first rental vehicle to begin receiving customer bookings.</p>
          <button class="btn btn-accent btn-sm" style="margin-top:16px;" onclick="openAddVehicleModal()">Add First Vehicle</button>
        </div>
      ` : mine.map(v => {
        const nextSlot = getNextUnavailableSlot(v.id);
        const slotText = nextSlot ? `Next Booked: ${nextSlot.from} to ${nextSlot.to}` : 'No upcoming bookings';
        return `
          <div class="v-card">
            <div class="v-card-img">
              <span class="v-card-loc">📍 ${v.location}</span>
              ${v.img}
            </div>
            <div class="v-card-body">
              <h4>${v.name}</h4>
              <div class="vtype">${v.type} · ${v.seats} seats · ${v.fuel} · Reg: ${v.regNo || 'N/A'}</div>
              <div class="slot-badge ${nextSlot?'slot-booked':'slot-avail'}" style="margin:6px 0;">${slotText}</div>
              <div class="price">৳${v.price.toLocaleString()}<span>/day</span></div>
            </div>
            <div class="v-card-footer" style="flex-direction:column;gap:6px;">
              <div style="display:flex;gap:6px;width:100%;">
                <button class="btn btn-outline btn-sm" style="flex:1;" onclick="openEditVehicleModal(${v.id})">Edit Specs</button>
                <button class="btn btn-ghost btn-sm" style="flex:1;" onclick="toggleVehicleStatus(${v.id})">
                  Status: ${v.status.toUpperCase()}
                </button>
                <button class="btn btn-danger btn-sm" onclick="ownerDeleteVehicle(${v.id})" title="Delete Vehicle">🗑️</button>
              </div>
            </div>
          </div>
        `;
      }).join('')}
    </div>
  `;
}

function ownerDeleteVehicle(id) {
  const v = db.vehicles.find(x => x.id === id);
  if (!v) return;
  const hasActive = (db.bookings || []).some(b => b.vehicleId === id && (b.status === 'active' || b.status === 'approved'));
  if (hasActive) {
    return toast('Cannot delete vehicle with active or upcoming confirmed reservations.', 'err');
  }
  db.vehicles = db.vehicles.filter(x => x.id !== id);
  logAudit('VEHICLE_DELETE', 'Vehicle', `Vehicle ${v.name} deleted by owner ${currentUser.name}`);
  save();
  toast('Vehicle removed from fleet.', 'ok');
  loadPage('o_vehicles');
}

function openAddVehicleModal() {
  const locs = db.locations || [];
  openModal('Add Vehicle to Fleet', '', `
    <div class="form-grid" style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
      <div style="grid-column:1/-1;">
        <label style="margin-top:0;">Vehicle Model Name</label>
        <input type="text" id="nv_name" placeholder="e.g. Toyota Axio 2021">
      </div>
      <div>
        <label style="margin-top:0;">Type</label>
        <select id="nv_type">
          <option>Sedan</option><option>SUV</option><option>Van</option><option>Minibus</option><option>Motorcycle</option>
        </select>
      </div>
      <div>
        <label style="margin-top:0;">Daily Rate (৳)</label>
        <input type="number" id="nv_price" placeholder="3000" min="100">
      </div>
      <div>
        <label style="margin-top:0;">Hub / Location</label>
        <select id="nv_loc">
          ${locs.map(l => `<option value="${l.name}">${l.name}</option>`).join('')}
        </select>
      </div>
      <div>
        <label style="margin-top:0;">Passenger Seats</label>
        <input type="number" id="nv_seats" placeholder="5" min="1" value="5">
      </div>
      <div>
        <label style="margin-top:0;">Fuel Type</label>
        <select id="nv_fuel">
          <option>Octane</option><option>Diesel</option><option>Petrol</option><option>Hybrid</option><option>Electric</option>
        </select>
      </div>
      <div>
        <label style="margin-top:0;">Registration No</label>
        <input type="text" id="nv_reg" placeholder="DHK-MET-GA-1234">
      </div>
    </div>
  `, () => {
    const name = document.getElementById('nv_name').value.trim();
    const type = document.getElementById('nv_type').value;
    const price = parseInt(document.getElementById('nv_price').value);
    const location = document.getElementById('nv_loc').value;
    const seats = parseInt(document.getElementById('nv_seats').value) || 5;
    const fuel = document.getElementById('nv_fuel').value;
    const regNo = document.getElementById('nv_reg').value.trim() || 'REG-PENDING';

    if (!name || !price) return toast('Please enter vehicle name and price', 'err');

    const icons = { Sedan: '🚘', SUV: '🚙', Van: '🚐', Minibus: '🚌', Motorcycle: '🏍️' };

    const newVeh = {
      id: genId(),
      name,
      type,
      price,
      location,
      seats,
      fuel,
      regNo,
      status: 'available',
      owner: currentUser.id,
      img: icons[type] || '🚗',
      is_verified: true
    };

    db.vehicles.push(newVeh);
    logAudit('VEHICLE_ADD', 'Vehicle', `Vehicle ${name} added by owner ${currentUser.name}`);
    save();
    closeModal();
    toast('Vehicle successfully added to fleet!', 'ok');
    loadPage('o_vehicles');
  });
}

function openEditVehicleModal(vid) {
  const v = db.vehicles.find(x => x.id === vid);
  if (!v) return;

  openModal(`Edit ${v.name}`, '', `
    <label style="margin-top:0;">Vehicle Name</label>
    <input type="text" id="ev_name" value="${v.name}">
    <label>Daily Rental Rate (৳)</label>
    <input type="number" id="ev_price" value="${v.price}">
    <label>Hub Location</label>
    <select id="ev_loc">
      ${(db.locations || []).map(l => `<option value="${l.name}" ${l.name===v.location?'selected':''}>${l.name}</option>`).join('')}
    </select>
  `, () => {
    v.name = document.getElementById('ev_name').value.trim();
    v.price = parseInt(document.getElementById('ev_price').value) || v.price;
    v.location = document.getElementById('ev_loc').value;
    save();
    closeModal();
    toast('Vehicle specifications updated!', 'ok');
    loadPage('o_vehicles');
  });
}

function toggleVehicleStatus(id) {
  const v = db.vehicles.find(x => x.id === id);
  if (v) {
    v.status = (v.status === 'available') ? 'unavailable' : 'available';
    save();
    toast(`Vehicle status changed to: ${v.status.toUpperCase()}`, 'ok');
    loadPage('o_vehicles');
  }
}

// ---------------------------------------------------------------------
// BOOKINGS & DRIVER ASSIGNMENT
// ---------------------------------------------------------------------

function o_bookings() {
  const myVehIds = (db.vehicles || []).filter(v => v.owner === currentUser.id).map(v => v.id);
  const requests = (db.bookings || []).filter(b => myVehIds.includes(b.vehicleId));

  return `
    <div class="page-title">Booking Requests & Assignments</div>
    <div class="page-sub">Review incoming customer reservations, confirm trips, and assign qualified chauffeurs</div>

    <div class="section-card">
      ${requests.length === 0 ? '<p style="color:var(--muted);">No booking requests found on your fleet.</p>' : `
      <table>
        <tr><th>Customer</th><th>Vehicle</th><th>Dates</th><th>Amount</th><th>Assigned Driver</th><th>Status</th><th>Actions</th></tr>
        ${[...requests].reverse().map(b => `
          <tr>
            <td><strong>${b.userName}</strong></td>
            <td>${b.vehicleName}</td>
            <td>${b.from} to ${b.to}</td>
            <td>৳${b.amount.toLocaleString()}</td>
            <td>👨‍✈️ ${b.driverName || 'None'}</td>
            <td><span class="badge badge-${b.status}">${b.status}</span></td>
            <td>
              <div style="display:flex;gap:6px;">
                ${b.status === 'pending' ? `
                  <button class="btn btn-success btn-sm" onclick="ownerApprove(${b.id})">Approve</button>
                  <button class="btn btn-danger btn-sm" onclick="ownerReject(${b.id})">Reject</button>
                ` : ''}
                <button class="btn btn-outline btn-sm" onclick="openAssignDriverModal(${b.id})">Assign Driver</button>
              </div>
            </td>
          </tr>
        `).join('')}
      </table>`}
    </div>
  `;
}

function ownerApprove(id) {
  const b = db.bookings.find(x => x.id === id);
  if (b) {
    b.status = 'approved';
    addNotif(b.userId, 'Booking Approved!', `Your booking for ${b.vehicleName} has been approved.`);
    logAudit('BOOKING_APPROVE', 'Booking', `Booking #${b.id} approved by fleet owner ${currentUser.name}`);
    save();
    toast('Booking approved!', 'ok');
    loadPage('o_bookings');
  }
}

function ownerReject(id) {
  const b = db.bookings.find(x => x.id === id);
  if (b) {
    b.status = 'cancelled';
    addNotif(b.userId, 'Booking Declined', `Your booking for ${b.vehicleName} was declined.`);
    logAudit('BOOKING_REJECT', 'Booking', `Booking #${b.id} rejected by fleet owner ${currentUser.name}`);
    save();
    toast('Booking rejected.', 'ok');
    loadPage('o_bookings');
  }
}

function openAssignDriverModal(bId) {
  const b = db.bookings.find(x => x.id === bId);
  if (!b) return;
  const drivers = db.drivers || [];

  openModal(`Assign Driver to Booking #${b.id}`, '', `
    <p style="font-size:.85rem;color:var(--muted);margin-bottom:12px;">Choose an on-duty professional driver for <strong>${b.vehicleName}</strong>.</p>
    <label style="margin-top:0;">Select Driver</label>
    <select id="selDriver">
      ${drivers.map(d => `<option value="${d.id}" ${d.id===b.driverId?'selected':''}>${d.name} (License: ${d.license}, Rating: ★ ${getDriverAvgRating(d.id)})${d.status==='active'?' · Ready':''}</option>`).join('')}
    </select>
  `, () => {
    const drId = parseInt(document.getElementById('selDriver').value);
    const dr = db.drivers.find(x => x.id === drId);
    if (dr) {
      b.driverId = dr.id;
      b.driverName = dr.name;
      addNotif(dr.userId, 'New Trip Assigned', `You have been assigned to trip #${b.id} with passenger ${b.userName}.`);
      addNotif(b.userId, 'Driver Assigned!', `👨‍✈️ ${dr.name} has been assigned as your chauffeur for trip #${b.id}.`);
      logAudit('DRIVER_ASSIGN', 'Trip', `Driver ${dr.name} assigned to trip #${b.id}`);
      save();
      closeModal();
      toast('Driver assigned successfully!', 'ok');
      loadPage('o_bookings');
    }
  });
}

// ---------------------------------------------------------------------
// FLEET CALENDAR & SCHEDULE VISUALIZER
// ---------------------------------------------------------------------

function o_calendar() {
  const myVehicles = (db.vehicles || []).filter(v => v.owner === currentUser.id);
  const myVehIds = myVehicles.map(v => v.id);
  const bookings = (db.bookings || []).filter(b => myVehIds.includes(b.vehicleId) && b.status !== 'cancelled');

  return `
    <div class="page-title">Fleet Booking Calendar 📅</div>
    <div class="page-sub">Visual schedule overview of vehicle occupancy, upcoming reservations, and maintenance intervals</div>

    <div class="section-card">
      <h3>Active & Upcoming Fleet Reservations</h3>
      ${bookings.length === 0 ? '<p style="color:var(--muted);">No bookings scheduled on the calendar.</p>' : `
      <table>
        <tr><th>Vehicle</th><th>Customer</th><th>Reserved Interval</th><th>Pickup Hub</th><th>Status</th></tr>
        ${bookings.map(b => `
          <tr>
            <td><strong>${b.vehicleName}</strong></td>
            <td>${b.userName}</td>
            <td>📅 ${b.from} to ${b.to} (${b.days} days)</td>
            <td>📍 ${b.pickupLoc || 'Banani'}</td>
            <td><span class="badge badge-${b.status}">${b.status}</span></td>
          </tr>
        `).join('')}
      </table>`}
    </div>
  `;
}

// ---------------------------------------------------------------------
// FLEET DRIVER MANAGEMENT
// ---------------------------------------------------------------------

function o_driver() {
  const drivers = db.drivers || [];

  return `
    <div class="page-title">Fleet Driver Management 👨‍✈️</div>
    <div class="page-sub">Driver directory, license verification, passenger ratings, availability status, and driver assignments</div>

    <div style="margin-bottom:16px;">
      <button class="btn btn-accent btn-sm" onclick="openAddDriverModal()">+ Add New Driver</button>
    </div>

    <div class="section-card">
      ${drivers.length === 0 ? '<p style="color:var(--muted);">No drivers registered under fleet yet. Click "+ Add New Driver" above to enlist your first chauffeur.</p>' : `
      <table>
        <tr><th>Driver Name</th><th>License No</th><th>Phone</th><th>Experience</th><th>Rating</th><th>Status</th><th>Actions</th></tr>
        ${drivers.map(d => {
          const avg = getDriverAvgRating(d.id);
          const revCount = getDriverReviews(d.id).length;
          return `
            <tr>
              <td><strong>👨‍✈️ ${d.name}</strong></td>
              <td><code>${d.license}</code></td>
              <td>${d.phone}</td>
              <td>${d.experience || 3} Years</td>
              <td><span style="color:#eab308;font-weight:700;">★ ${avg}</span> (${revCount})</td>
              <td><span class="badge badge-${d.status==='active'?'active':d.status==='on-trip'?'approved':'pending'}">${d.status || 'active'}</span></td>
              <td>
                <div style="display:flex;gap:6px;">
                  <button class="btn btn-outline btn-sm" onclick="openEditDriverModal(${d.id})">Edit</button>
                  <button class="btn btn-danger btn-sm" onclick="deleteDriver(${d.id})" title="Remove Driver">🗑️</button>
                </div>
              </td>
            </tr>
          `;
        }).join('')}
      </table>`}
    </div>
  `;
}

function openAddDriverModal() {
  openModal('Add New Fleet Driver', '', `
    <div class="form-grid" style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
      <div style="grid-column:1/-1;">
        <label style="margin-top:0;">Driver Full Name</label>
        <input type="text" id="ndr_name" placeholder="e.g. Rafiqul Islam">
      </div>
      <div>
        <label style="margin-top:0;">Driving License No</label>
        <input type="text" id="ndr_lic" placeholder="DL-DHAKA-2026-XXXX">
      </div>
      <div>
        <label style="margin-top:0;">Phone Number</label>
        <input type="tel" id="ndr_phone" placeholder="017XXXXXXXX">
      </div>
      <div>
        <label style="margin-top:0;">Driving Experience (Years)</label>
        <input type="number" id="ndr_exp" placeholder="4" min="1" value="3">
      </div>
      <div>
        <label style="margin-top:0;">Availability Status</label>
        <select id="ndr_status">
          <option value="active">Active (Available)</option>
          <option value="off-duty">Off-duty</option>
        </select>
      </div>
    </div>
  `, () => {
    const name = document.getElementById('ndr_name').value.trim();
    const license = document.getElementById('ndr_lic').value.trim();
    const phone = document.getElementById('ndr_phone').value.trim();
    const experience = parseInt(document.getElementById('ndr_exp').value) || 1;
    const status = document.getElementById('ndr_status').value;

    if (!name || !license) return toast('Please enter driver name and license number', 'err');

    if (!db.drivers) db.drivers = [];
    const newId = genId();
    db.drivers.push({
      id: newId,
      userId: newId,
      name,
      license,
      phone: phone || '01700-000000',
      experience,
      status
    });

    logAudit('DRIVER_ADD', 'Driver', `Driver ${name} added by fleet owner ${currentUser.name}`);
    save();
    closeModal();
    toast('Driver added to fleet successfully!', 'ok');
    loadPage('o_driver');
  });
}

function openEditDriverModal(id) {
  const d = (db.drivers || []).find(x => x.id === id);
  if (!d) return;

  openModal(`Edit Driver: ${d.name}`, '', `
    <label style="margin-top:0;">Full Name</label>
    <input type="text" id="edr_name" value="${d.name}">
    <label>License No</label>
    <input type="text" id="edr_lic" value="${d.license}">
    <label>Phone Number</label>
    <input type="tel" id="edr_phone" value="${d.phone || ''}">
    <label>Experience (Years)</label>
    <input type="number" id="edr_exp" value="${d.experience || 3}">
    <label>Availability Status</label>
    <select id="edr_status">
      <option value="active" ${d.status==='active'?'selected':''}>Active (Available)</option>
      <option value="off-duty" ${d.status==='off-duty'?'selected':''}>Off-duty</option>
      <option value="on-trip" ${d.status==='on-trip'?'selected':''}>On Trip</option>
    </select>
  `, () => {
    d.name = document.getElementById('edr_name').value.trim() || d.name;
    d.license = document.getElementById('edr_lic').value.trim() || d.license;
    d.phone = document.getElementById('edr_phone').value.trim();
    d.experience = parseInt(document.getElementById('edr_exp').value) || d.experience;
    d.status = document.getElementById('edr_status').value;

    logAudit('DRIVER_EDIT', 'Driver', `Driver ${d.name} profile updated by ${currentUser.name}`);
    save();
    closeModal();
    toast('Driver details updated!', 'ok');
    loadPage('o_driver');
  });
}

function deleteDriver(id) {
  const d = (db.drivers || []).find(x => x.id === id);
  if (!d) return;
  const hasActiveTrips = (db.bookings || []).some(b => b.driverId === id && (b.status === 'active' || b.status === 'approved'));
  if (hasActiveTrips) {
    return toast('Cannot delete driver with active or assigned trips.', 'err');
  }
  db.drivers = db.drivers.filter(x => x.id !== id);
  logAudit('DRIVER_DELETE', 'Driver', `Driver ${d.name} deleted by ${currentUser.name}`);
  save();
  toast('Driver removed from fleet.', 'ok');
  loadPage('o_driver');
}


// ---------------------------------------------------------------------
// VEHICLE DOCUMENTS & COMPLIANCE
// ---------------------------------------------------------------------

function o_documents() {
  const myVehIds = (db.vehicles || []).filter(v => v.owner === currentUser.id).map(v => v.id);
  const docs = (db.documents || []).filter(d => myVehIds.includes(d.vehicleId) || d.vehicleId === 1);

  return `
    <div class="page-title">Vehicle Documents & Compliance 📑</div>
    <div class="page-sub">Monitor Registration, Insurance, Tax Token, and Fitness Certificate expirations across your fleet</div>

    <div style="margin-bottom:16px;">
      <button class="btn btn-accent btn-sm" onclick="openUploadDocModal()">+ Upload Vehicle Document</button>
    </div>

    <div class="section-card">
      <table>
        <tr><th>Vehicle</th><th>Document Type</th><th>Document / Policy No</th><th>Expiry Date</th><th>Compliance Status</th><th>Verification</th></tr>
        ${docs.map(d => `
          <tr>
            <td><strong>${d.vehicleName}</strong></td>
            <td>${d.docType}</td>
            <td><code>${d.docNumber}</code></td>
            <td>${d.expiryDate}</td>
            <td><span class="badge badge-active">🟢 Compliant</span></td>
            <td><span class="badge badge-approved">${d.status || 'verified'}</span></td>
          </tr>
        `).join('')}
      </table>
    </div>
  `;
}

function openUploadDocModal() {
  const myVehicles = (db.vehicles || []).filter(v => v.owner === currentUser.id);
  openModal('Upload Vehicle Compliance Document', '', `
    <label style="margin-top:0;">Select Vehicle</label>
    <select id="docVehId">
      ${myVehicles.map(v => `<option value="${v.id}">${v.name} (${v.regNo})</option>`).join('')}
    </select>
    <label>Document Type</label>
    <select id="docType">
      <option>Registration Certificate</option>
      <option>Insurance Policy</option>
      <option>Tax Token</option>
      <option>Fitness Certificate</option>
    </select>
    <label>Certificate / Policy Number</label>
    <input type="text" id="docNum" placeholder="e.g. INS-2026-99011">
    <label>Expiry Date</label>
    <input type="date" id="docExp" min="${new Date().toISOString().split('T')[0]}">
  `, () => {
    const vId = parseInt(document.getElementById('docVehId').value);
    const v = db.vehicles.find(x => x.id === vId);
    const docType = document.getElementById('docType').value;
    const docNum = document.getElementById('docNum').value.trim();
    const docExp = document.getElementById('docExp').value;

    if (!docNum || !docExp) return toast('Please enter document number and expiry date', 'err');

    if (!db.documents) db.documents = [];
    db.documents.push({
      id: genId(),
      vehicleId: vId,
      vehicleName: v ? v.name : 'Fleet Car',
      docType,
      docNumber: docNum,
      expiryDate: docExp,
      status: 'pending'
    });

    logAudit('DOC_UPLOAD', 'Compliance', `Document ${docType} uploaded for ${v?.name}`);
    save();
    closeModal();
    toast('Document uploaded for administrator verification!', 'ok');
    loadPage('o_documents');
  });
}

// ---------------------------------------------------------------------
// OWNER NOTIFICATIONS & PROFILE
// ---------------------------------------------------------------------

function o_notifications() {
  const notifs = (db.notifications || []).filter(n => n.to === currentUser.id || n.to === 'all' || n.to === 'owner');
  return `
    <div class="page-title">Fleet Notifications</div>
    <div class="page-sub">Booking inquiries, vehicle maintenance alerts, and compliance reminders</div>
    <div class="section-card">
      ${notifs.map(n => `
        <div style="padding:10px 14px;background:var(--surface2);border-radius:8px;font-size:.83rem;margin-bottom:6px;">
          <strong>${n.title}</strong> — ${n.body || n.message}
        </div>
      `).join('')}
    </div>
  `;
}

function o_profile() {
  return `
    <div class="page-title">Fleet Business Profile</div>
    <div class="page-sub">Manage fleet company information, payment payout accounts, and business credentials</div>
    <div class="section-card" style="max-width:550px;">
      <label style="margin-top:0;">Fleet / Business Name</label>
      <input type="text" id="ownBizName" value="${currentUser.name} Fleet Rentals">
      <label>Email Address</label>
      <input type="email" value="${currentUser.email}" disabled style="opacity:.7;">
      <label>Contact Phone</label>
      <input type="tel" id="ownPhone" value="${currentUser.phone || ''}">
      <label>Payout Account (bKash / Bank Account Details)</label>
      <input type="text" id="ownPayoutAcc" placeholder="e.g. bKash Merchant: 01700-XXXXXX or DBBL AC: 112.120.XXXX">

      <div style="margin-top:18px;">
        <button class="btn btn-accent" onclick="saveOwnerProfile()">Save Fleet Details</button>
      </div>
    </div>
  `;
}

function saveOwnerProfile() {
  const p = document.getElementById('ownPhone').value.trim();
  currentUser.phone = p;
  save();
  sessionStorage.setItem('vrms_user', JSON.stringify(currentUser));
  toast('Fleet profile updated!', 'ok');
  loadPage('o_profile');
}


// =====================================================================
// 🛡️ ADMINISTRATOR MODULE
// =====================================================================

function a_home() {
  const users = db.users || [];
  const customers = users.filter(u => u.role === 'user').length;
  const drivers = users.filter(u => u.role === 'driver').length;
  const owners = users.filter(u => u.role === 'owner').length;
  const totalRev = (db.payments || []).filter(p => p.status === 'approved').reduce((acc, p) => acc + p.amount, 0);
  const pendingPayments = (db.payments || []).filter(p => p.status === 'pending').length;
  const openComplaints = (db.complaints || []).filter(c => c.status === 'open').length;
  const pendingDocs = (db.documents || []).filter(d => d.status === 'pending').length;

  return `
    <div class="page-title">System Administration Dashboard 🛡️</div>
    <div class="page-sub">Central platform command center, governance, and operational analytics</div>

    <!-- STATS -->
    <div class="stats-row">
      <div class="stat-card">
        <div class="label">Gross Revenue</div>
        <div class="value" style="color:var(--accent)">৳${totalRev.toLocaleString()}</div>
        <div class="change">Total verified transactions</div>
      </div>
      <div class="stat-card">
        <div class="label">Total Customers</div>
        <div class="value">${customers}</div>
        <div class="change">Registered renters</div>
      </div>
      <div class="stat-card">
        <div class="label">Drivers / Chauffeurs</div>
        <div class="value">${drivers}</div>
        <div class="change">Active fleet drivers</div>
      </div>
      <div class="stat-card">
        <div class="label">Fleet Owners</div>
        <div class="value">${owners}</div>
        <div class="change">Business partners</div>
      </div>
      <div class="stat-card">
        <div class="label">Pending Payments</div>
        <div class="value" style="color:var(--warning)">${pendingPayments}</div>
        <div class="change">Awaiting verification</div>
      </div>
      <div class="stat-card">
        <div class="label">Open Support Tickets</div>
        <div class="value" style="color:var(--danger)">${openComplaints}</div>
        <div class="change">Pending complaints</div>
      </div>
    </div>

    <!-- RECENT BOOKINGS OVERVIEW -->
    <div class="section-card">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;">
        <h3 style="margin-bottom:0;">Recent Platform Bookings</h3>
        <button class="btn btn-ghost btn-sm" onclick="loadPage('a_bookings')">All Bookings →</button>
      </div>
      <table>
        <tr><th>Booking ID</th><th>Customer</th><th>Vehicle</th><th>Dates</th><th>Total Amount</th><th>Status</th></tr>
        ${(db.bookings || []).slice(-5).reverse().map(b => `
          <tr>
            <td>#${b.id}</td>
            <td><strong>${b.userName}</strong></td>
            <td>${b.vehicleName}</td>
            <td>${b.from} to ${b.to}</td>
            <td>৳${b.amount.toLocaleString()}</td>
            <td><span class="badge badge-${b.status}">${b.status.toUpperCase()}</span></td>
          </tr>
        `).join('')}
      </table>
    </div>
  `;
}

// ---------------------------------------------------------------------
// USER MANAGEMENT
// ---------------------------------------------------------------------

let adminUserFilterRole = 'all';

function a_users() {
  let list = db.users || [];
  if (adminUserFilterRole !== 'all') {
    list = list.filter(u => u.role === adminUserFilterRole);
  }

  return `
    <div class="page-title">User Accounts Governance</div>
    <div class="page-sub">Manage registered customers, drivers, fleet owners, and administrators</div>

    <div class="filter-bar" style="margin-bottom:16px;">
      <select onchange="adminUserFilterRole=this.value;loadPage('a_users')">
        <option value="all">👥 All Roles</option>
        <option value="user" ${adminUserFilterRole==='user'?'selected':''}>🙋 Customers</option>
        <option value="driver" ${adminUserFilterRole==='driver'?'selected':''}>👨‍✈️ Drivers</option>
        <option value="owner" ${adminUserFilterRole==='owner'?'selected':''}>🚗 Fleet Owners</option>
        <option value="admin" ${adminUserFilterRole==='admin'?'selected':''}>🛡️ Administrators</option>
      </select>
    </div>

    <div class="section-card">
      <table>
        <tr><th>Name</th><th>Email</th><th>Phone</th><th>Role</th><th>Verification</th><th>Status</th><th>Actions</th></tr>
        ${list.map(u => {
          const isPrimaryAdmin = u.email.toLowerCase() === '2023100000502@seu.edu.bd';
          return `
            <tr>
              <td><strong>${u.name}</strong></td>
              <td>${u.email}</td>
              <td>${u.phone || '—'}</td>
              <td><span class="badge badge-${u.role==='admin'?'cancelled':u.role==='driver'?'pending':'active'}">${u.role.toUpperCase()}</span></td>
              <td>
                <span class="badge ${u.verification_status==='verified'?'badge-active':'badge-pending'}">
                  ${u.verification_status || 'verified'}
                </span>
              </td>
              <td><span class="badge badge-active">Active</span></td>
              <td>
                <div style="display:flex;gap:6px;">
                  ${u.verification_status !== 'verified' ? `
                    <button class="btn btn-success btn-sm" onclick="adminVerifyUser(${u.id})">Verify</button>
                  ` : ''}
                  ${!isPrimaryAdmin && u.id !== currentUser.id ? `
                    <button class="btn btn-danger btn-sm" onclick="deleteUser(${u.id})">Delete</button>
                  ` : '<span style="color:var(--muted);font-size:.78rem;">Protected</span>'}
                </div>
              </td>
            </tr>
          `;
        }).join('')}
      </table>
    </div>
  `;
}

function adminVerifyUser(id) {
  const u = db.users.find(x => x.id === id);
  if (u) {
    u.verification_status = 'verified';
    addNotif(u.id, 'Account Verified!', 'Your account identity documents have been approved by the Administrator.');
    logAudit('USER_VERIFY', 'User', `User ${u.name} (${u.email}) marked as verified`);
    save();
    toast('User verified successfully!', 'ok');
    loadPage('a_users');
  }
}

function deleteUser(id) {
  const target = db.users.find(u => u.id === id);
  if (!target) return;
  if ((currentUser && id === currentUser.id) || target.email.toLowerCase() === '2023100000502@seu.edu.bd') {
    return toast("Cannot delete primary system administrator", 'err');
  }
  db.users = db.users.filter(u => u.id !== id);
  db.bookings = (db.bookings || []).filter(b => b.userId !== id);
  db.payments = (db.payments || []).filter(p => p.userId !== id);
  logAudit('USER_DELETE', 'User', `User ${target.name} (${target.email}) deleted`);
  save();
  toast('User account removed.', 'ok');
  loadPage('a_users');
}

// ---------------------------------------------------------------------
// VEHICLE MANAGEMENT
// ---------------------------------------------------------------------

function a_vehicles() {
  const list = db.vehicles || [];

  return `
    <div class="page-title">All Fleet Vehicles</div>
    <div class="page-sub">Central inventory of all vehicles across system fleet and private fleet partners</div>

    <div class="section-card">
      <table>
        <tr><th>Vehicle</th><th>Type</th><th>Location Hub</th><th>Daily Rate</th><th>Owner</th><th>Status</th><th>Actions</th></tr>
        ${list.map(v => `
          <tr>
            <td>${v.img} <strong>${v.name}</strong></td>
            <td>${v.type}</td>
            <td>📍 ${v.location}</td>
            <td>৳${v.price.toLocaleString()}</td>
            <td>${v.owner ? 'Partner Fleet' : 'System Fleet'}</td>
            <td><span class="badge badge-${v.status==='available'?'active':'cancelled'}">${v.status.toUpperCase()}</span></td>
            <td>
              <button class="btn btn-outline btn-sm" onclick="toggleVehicleStatusAdmin(${v.id})">Toggle Status</button>
            </td>
          </tr>
        `).join('')}
      </table>
    </div>
  `;
}

function toggleVehicleStatusAdmin(id) {
  const v = db.vehicles.find(x => x.id === id);
  if (v) {
    v.status = (v.status === 'available') ? 'maintenance' : 'available';
    logAudit('VEHICLE_STATUS_CHANGE', 'Vehicle', `Status of ${v.name} changed to ${v.status}`);
    save();
    toast(`Vehicle status updated to ${v.status}`, 'ok');
    loadPage('a_vehicles');
  }
}

// ---------------------------------------------------------------------
// BOOKING MANAGEMENT
// ---------------------------------------------------------------------

function a_bookings() {
  const bookings = db.bookings || [];

  return `
    <div class="page-title">Master Booking Register</div>
    <div class="page-sub">System-wide reservation logs, dispute resolution, and status overrides</div>

    <div class="section-card">
      <table>
        <tr><th>ID</th><th>Customer</th><th>Vehicle</th><th>Dates</th><th>Cost</th><th>Status</th><th>Actions</th></tr>
        ${[...bookings].reverse().map(b => `
          <tr>
            <td>#${b.id}</td>
            <td>${b.userName}</td>
            <td><strong>${b.vehicleName}</strong></td>
            <td>${b.from} to ${b.to}</td>
            <td>৳${b.amount.toLocaleString()}</td>
            <td><span class="badge badge-${b.status}">${b.status}</span></td>
            <td>
              <div style="display:flex;gap:6px;">
                <button class="btn btn-ghost btn-sm" onclick="openBookingDetailsModal(${b.id})">Details</button>
                ${b.status !== 'cancelled' ? `
                  <button class="btn btn-danger btn-sm" onclick="adminCancelBooking(${b.id})">Cancel</button>
                ` : ''}
              </div>
            </td>
          </tr>
        `).join('')}
      </table>
    </div>
  `;
}

function adminCancelBooking(id) {
  const b = db.bookings.find(x => x.id === id);
  if (b) {
    b.status = 'cancelled';
    addNotif(b.userId, 'Booking Cancelled by Admin', `Your booking for ${b.vehicleName} was cancelled by administrator.`);
    logAudit('ADMIN_CANCEL_BOOKING', 'Booking', `Booking #${b.id} cancelled by Admin`);
    save();
    toast('Booking cancelled.', 'ok');
    loadPage('a_bookings');
  }
}

// ---------------------------------------------------------------------
// PAYMENT MANAGEMENT
// ---------------------------------------------------------------------

function a_payments() {
  const payments = db.payments || [];

  return `
    <div class="page-title">Payment Verifications & Transactions 💰</div>
    <div class="page-sub">Verify digital payment transactions, approve receipts, and manage refunds</div>

    <div class="section-card">
      <table>
        <tr><th>User</th><th>Vehicle</th><th>Gateway</th><th>TXN ID</th><th>Amount</th><th>Status</th><th>Actions</th></tr>
        ${[...payments].reverse().map(p => `
          <tr>
            <td>${getUserName(p.userId)}</td>
            <td><strong>${p.vehicleName}</strong></td>
            <td>${p.method}</td>
            <td><code>${p.txn}</code></td>
            <td>৳${p.amount.toLocaleString()}</td>
            <td><span class="badge badge-${p.status}">${p.status}</span></td>
            <td>
              <div style="display:flex;gap:6px;">
                ${p.status === 'pending' ? `
                  <button class="btn btn-success btn-sm" onclick="approvePayment(${p.id})">Approve</button>
                  <button class="btn btn-danger btn-sm" onclick="rejectPayment(${p.id})">Reject</button>
                ` : `
                  <span style="font-size:.78rem;color:var(--success);font-weight:700;">✓ Verified</span>
                `}
              </div>
            </td>
          </tr>
        `).join('')}
      </table>
    </div>
  `;
}

function getUserName(uid) {
  const u = db.users.find(x => x.id === uid);
  return u ? u.name : 'Customer';
}

function approvePayment(pid) {
  const p = db.payments.find(x => x.id === pid);
  if (p) {
    p.status = 'approved';
    const b = db.bookings.find(x => x.id === p.bookingId);
    if (b) b.status = 'approved';
    addNotif(p.userId, 'Payment Approved!', `Your payment of ৳${p.amount} has been verified.`);
    logAudit('PAYMENT_APPROVE', 'Payment', `Payment #${p.id} approved for ৳${p.amount}`);
    save();
    toast('Payment approved!', 'ok');
    loadPage('a_payments');
  }
}

function rejectPayment(pid) {
  const p = db.payments.find(x => x.id === pid);
  if (p) {
    p.status = 'rejected';
    addNotif(p.userId, 'Payment Rejected', `Your payment transaction ${p.txn} could not be verified. Please contact support.`);
    logAudit('PAYMENT_REJECT', 'Payment', `Payment #${p.id} rejected`);
    save();
    toast('Payment rejected.', 'ok');
    loadPage('a_payments');
  }
}

// ---------------------------------------------------------------------
// DRIVER VERIFICATION
// ---------------------------------------------------------------------

function a_driver_verify() {
  const drivers = db.drivers || [];

  return `
    <div class="page-title">Driver Verification Desk 👨‍✈️</div>
    <div class="page-sub">Verify driver driving licenses, background checks, and identity submissions</div>

    <div class="section-card">
      <table>
        <tr><th>Driver Name</th><th>License Number</th><th>Phone</th><th>Experience</th><th>Status</th><th>Actions</th></tr>
        ${drivers.map(d => `
          <tr>
            <td><strong>${d.name}</strong></td>
            <td><code>${d.license}</code></td>
            <td>${d.phone}</td>
            <td>${d.experience || 3} Years</td>
            <td><span class="badge ${d.verification_status==='verified'?'badge-active':'badge-pending'}">${d.verification_status || 'verified'}</span></td>
            <td>
              <div style="display:flex;gap:6px;">
                <button class="btn btn-success btn-sm" onclick="adminVerifyDriver(${d.id})">Approve License</button>
              </div>
            </td>
          </tr>
        `).join('')}
      </table>
    </div>
  `;
}

function adminVerifyDriver(id) {
  const d = db.drivers.find(x => x.id === id);
  if (d) {
    d.verification_status = 'verified';
    addNotif(d.userId, 'Driver Credentials Verified!', 'Your driving license has been approved by the platform.');
    logAudit('DRIVER_VERIFY', 'Driver', `Driver ${d.name} verified`);
    save();
    toast('Driver verified!', 'ok');
    loadPage('a_driver_verify');
  }
}

// ---------------------------------------------------------------------
// FLEET VERIFICATION
// ---------------------------------------------------------------------

function a_fleet_verify() {
  const docs = db.documents || [];

  return `
    <div class="page-title">Fleet Verification Desk 🏢</div>
    <div class="page-sub">Review vehicle fitness certificates, tax tokens, and registration records submitted by fleet owners</div>

    <div class="section-card">
      <table>
        <tr><th>Vehicle</th><th>Document Type</th><th>Number</th><th>Expiry Date</th><th>Status</th><th>Actions</th></tr>
        ${docs.map(d => `
          <tr>
            <td><strong>${d.vehicleName}</strong></td>
            <td>${d.docType}</td>
            <td><code>${d.docNumber}</code></td>
            <td>${d.expiryDate}</td>
            <td><span class="badge badge-approved">${d.status || 'verified'}</span></td>
            <td>
              <button class="btn btn-success btn-sm" onclick="adminVerifyDoc(${d.id})">Verify Document</button>
            </td>
          </tr>
        `).join('')}
      </table>
    </div>
  `;
}

function adminVerifyDoc(id) {
  const d = db.documents.find(x => x.id === id);
  if (d) {
    d.status = 'verified';
    logAudit('DOC_VERIFY', 'Compliance', `Document ${d.docType} verified for ${d.vehicleName}`);
    save();
    toast('Document verified!', 'ok');
    loadPage('a_fleet_verify');
  }
}

// ---------------------------------------------------------------------
// MAINTENANCE MANAGEMENT
// ---------------------------------------------------------------------

function a_maintenance() {
  const reports = db.maintenance_reports || [];

  return `
    <div class="page-title">Maintenance & Defect Hub 🛠️</div>
    <div class="page-sub">System-wide vehicle problem reports, severity categorization, and repair resolution</div>

    <div class="section-card">
      <table>
        <tr><th>Vehicle</th><th>Issue</th><th>Severity</th><th>Reported By</th><th>Status</th><th>Action</th></tr>
        ${reports.map(r => `
          <tr>
            <td><strong>${r.vehicleName}</strong></td>
            <td>${r.issueType} - ${r.description}</td>
            <td><span class="badge badge-${r.severity==='critical'?'cancelled':'pending'}">${r.severity.toUpperCase()}</span></td>
            <td>${r.reporterName}</td>
            <td><span class="badge badge-${r.status==='resolved'?'active':'pending'}">${r.status}</span></td>
            <td>
              ${r.status !== 'resolved' ? `
                <button class="btn btn-success btn-sm" onclick="resolveMaintenanceAdmin(${r.id})">Mark Resolved</button>
              ` : '<span style="color:var(--success);font-weight:700;">✓ Solved</span>'}
            </td>
          </tr>
        `).join('')}
      </table>
    </div>
  `;
}

function resolveMaintenanceAdmin(id) {
  const r = db.maintenance_reports.find(x => x.id === id);
  if (r) {
    r.status = 'resolved';
    const v = db.vehicles.find(x => x.id === r.vehicleId);
    if (v && v.status === 'maintenance') v.status = 'available';
    logAudit('MAINTENANCE_RESOLVE', 'Maintenance', `Defect ${r.issueType} for ${r.vehicleName} resolved`);
    save();
    toast('Issue marked resolved and car restored to available!', 'ok');
    loadPage('a_maintenance');
  }
}

// ---------------------------------------------------------------------
// COMPLAINT MANAGEMENT
// ---------------------------------------------------------------------

function a_complaints() {
  const complaints = db.complaints || [];

  return `
    <div class="page-title">Complaint Management & Support Desk 🎧</div>
    <div class="page-sub">Resolve customer disputes, driver incidents, and support tickets</div>

    <div class="section-card">
      ${complaints.length === 0 ? '<p style="color:var(--muted);">No support tickets or complaints filed.</p>' : `
      <table>
        <tr><th>ID</th><th>User</th><th>Role</th><th>Subject</th><th>Description</th><th>Status</th><th>Action</th></tr>
        ${[...complaints].reverse().map(c => {
          const u = db.users.find(x => x.id === c.userId);
          return `
            <tr>
              <td>#${c.id}</td>
              <td><strong>${u ? u.name : 'User'}</strong></td>
              <td><span class="badge badge-approved">${(c.roleType || 'User').toUpperCase()}</span></td>
              <td>${c.subject}</td>
              <td>${c.description}</td>
              <td><span class="badge badge-${c.status==='resolved'?'active':'pending'}">${c.status.toUpperCase()}</span></td>
              <td>
                ${c.status !== 'resolved' ? `
                  <button class="btn btn-success btn-sm" onclick="openResolveComplaintModal(${c.id})">Resolve Ticket</button>
                ` : '<span style="color:var(--success);font-weight:700;">✓ Solved</span>'}
              </td>
            </tr>
          `;
        }).join('')}
      </table>`}
    </div>
  `;
}

function openResolveComplaintModal(id) {
  const c = db.complaints.find(x => x.id === id);
  if (!c) return;

  openModal(`Resolve Ticket #${c.id}`, '', `
    <p style="font-size:.85rem;color:var(--muted);margin-bottom:12px;">Subject: <strong>${c.subject}</strong></p>
    <label style="margin-top:0;">Resolution Notes / Action Taken</label>
    <textarea id="resNotes" placeholder="Describe the resolution provided to the user..." style="min-height:80px;"></textarea>
  `, () => {
    const notes = document.getElementById('resNotes').value.trim();
    c.status = 'resolved';
    c.admin_resolution = notes || 'Resolved by Administrator.';
    addNotif(c.userId, 'Support Ticket Resolved', `Your ticket regarding "${c.subject}" has been resolved: ${c.admin_resolution}`);
    logAudit('COMPLAINT_RESOLVE', 'Complaint', `Ticket #${c.id} resolved: ${c.admin_resolution}`);
    save();
    closeModal();
    toast('Ticket marked as resolved!', 'ok');
    loadPage('a_complaints');
  });
}

// ---------------------------------------------------------------------
// NOTIFICATION CENTER
// ---------------------------------------------------------------------

function a_notif_center() {
  const anns = db.announcements || [];

  return `
    <div class="page-title">Notification Center & Broadcasts 📢</div>
    <div class="page-sub">Send platform-wide announcements, emergency bulletins, and promotional updates</div>

    <div class="section-card">
      <h3>Broadcast New Announcement</h3>
      <div class="form-grid" style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
        <div>
          <label style="margin-top:0;">Target Audience</label>
          <select id="bcTarget">
            <option value="all">📢 All Users (Platform-Wide)</option>
            <option value="user">🙋 Customers Only</option>
            <option value="driver">👨‍✈️ Drivers Only</option>
            <option value="owner">🚗 Fleet Owners Only</option>
          </select>
        </div>
        <div>
          <label style="margin-top:0;">Category</label>
          <select id="bcCategory">
            <option value="General">General Notice</option>
            <option value="Emergency">Emergency Bulletin</option>
            <option value="Promotional">Promotional Special</option>
            <option value="Maintenance">Maintenance Advisory</option>
          </select>
        </div>
        <div style="grid-column:1/-1;">
          <label style="margin-top:0;">Announcement Title</label>
          <input type="text" id="bcTitle" placeholder="e.g. System Scheduled Maintenance Window">
        </div>
        <div style="grid-column:1/-1;">
          <label style="margin-top:0;">Message Body</label>
          <textarea id="bcMsg" placeholder="Enter message details here..." style="min-height:75px;"></textarea>
        </div>
      </div>
      <div style="margin-top:16px;">
        <button class="btn btn-accent" onclick="sendBroadcastAnnouncement()">Broadcast Now →</button>
      </div>
    </div>


  `;
}

function sendBroadcastAnnouncement() {
  const target = document.getElementById('bcTarget').value;
  const category = document.getElementById('bcCategory').value;
  const title = document.getElementById('bcTitle').value.trim();
  const msg = document.getElementById('bcMsg').value.trim();

  if (!title || !msg) return toast('Please enter title and message', 'err');

  addNotif(target, `[${category.toUpperCase()}] ${title}`, msg);
  save();
  toast('Announcement broadcasted to all matching users!', 'ok');
  document.getElementById('bcTitle').value = '';
  document.getElementById('bcMsg').value = '';
}

// ---------------------------------------------------------------------
// REPORTS & ANALYTICS (COMPREHENSIVE 3NF BUSINESS INSIGHTS)
// ---------------------------------------------------------------------

function a_reports() {
  const currentTab = window._adminReportTab || 'revenue';
  const totalRev = (db.payments || []).filter(p => p.status === 'approved').reduce((acc, p) => acc + p.amount, 0);
  const totalLiters = (db.fuel_logs || []).reduce((acc, f) => acc + (f.liters || 0), 0);
  const totalFuelCost = (db.fuel_logs || []).reduce((acc, f) => acc + (f.cost || 0), 0);
  const totalKmDriven = (db.fuel_logs || []).reduce((acc, f) => acc + ((f.odometerEnd && f.odometerStart) ? (f.odometerEnd - f.odometerStart) : 0), 0);

  const tabs = [
    { id: 'revenue', label: '📈 Revenue & Bookings' },
    { id: 'fuel', label: '⛽ Fuel Usage' },
    { id: 'vehicles', label: '🚗 Vehicle Availability & Rental History' },
    { id: 'drivers', label: '👨‍✈️ Driver Performance' },
    { id: 'maintenance', label: '🛠️ Maintenance' },
    { id: 'users', label: '👥 User Growth' },
    { id: 'export', label: '📥 Export Reports' }
  ];

  let tabContent = '';

  if (currentTab === 'revenue') {
    const bookings = db.bookings || [];
    const completed = bookings.filter(b => b.status === 'completed').length;
    const active = bookings.filter(b => b.status === 'active').length;
    const cancelled = bookings.filter(b => b.status === 'cancelled').length;

    tabContent = `
      <div class="stats-row">
        <div class="stat-card"><div class="label">Gross Revenue</div><div class="value">৳${totalRev.toLocaleString()}</div><div class="change">Approved transactions</div></div>
        <div class="stat-card"><div class="label">Completed Trips</div><div class="value" style="color:var(--success)">${completed}</div><div class="change">Trips concluded</div></div>
        <div class="stat-card"><div class="label">Active Trips</div><div class="value" style="color:var(--accent)">${active}</div><div class="change">Currently on road</div></div>
        <div class="stat-card"><div class="label">Cancelled</div><div class="value" style="color:var(--danger)">${cancelled}</div><div class="change">Cancelled inquiries</div></div>
      </div>

      <div class="section-card">
        <h3>Revenue & Booking Records</h3>
        <table>
          <tr><th>ID</th><th>Vehicle</th><th>Customer</th><th>Dates</th><th>Duration</th><th>Amount</th><th>Status</th></tr>
          ${bookings.map(b => `
            <tr>
              <td>#${b.id}</td>
              <td><strong>${b.vehicleName}</strong></td>
              <td>${b.userName}</td>
              <td>${b.from} to ${b.to}</td>
              <td>${b.days} Days</td>
              <td><strong>৳${b.amount.toLocaleString()}</strong></td>
              <td><span class="badge badge-${b.status}">${b.status.toUpperCase()}</span></td>
            </tr>
          `).join('')}
        </table>
      </div>
    `;
  } else if (currentTab === 'fuel') {
    const avgEco = totalLiters > 0 && totalKmDriven > 0 ? (totalKmDriven / totalLiters).toFixed(1) : 'N/A';
    const fuelLogs = db.fuel_logs || [];

    tabContent = `
      <div class="stats-row">
        <div class="stat-card"><div class="label">Total Fuel Logged</div><div class="value">${totalLiters.toFixed(1)} L</div><div class="change">Fleet consumption</div></div>
        <div class="stat-card"><div class="label">Total Fuel Cost</div><div class="value" style="color:var(--accent2)">৳${totalFuelCost.toLocaleString()}</div><div class="change">Operational expense</div></div>
        <div class="stat-card"><div class="label">Distance Covered</div><div class="value">${totalKmDriven.toLocaleString()} KM</div><div class="change">Odometer tracked</div></div>
        <div class="stat-card"><div class="label">Average Efficiency</div><div class="value" style="color:var(--success)">${avgEco} KM/L</div><div class="change">Fleet fuel economy</div></div>
      </div>

      <div class="section-card">
        <h3>Trip Fuel & Mileage Records</h3>
        ${fuelLogs.length === 0 ? '<p style="color:var(--muted);">No fuel logs recorded yet.</p>' : `
        <table>
          <tr><th>Trip ID</th><th>Driver</th><th>Vehicle</th><th>Fuel Volume</th><th>Cost</th><th>Odometer (Start → End)</th><th>KM Driven</th><th>Date</th></tr>
          ${fuelLogs.map(f => {
            const km = (f.odometerEnd && f.odometerStart) ? (f.odometerEnd - f.odometerStart) : 0;
            return `
              <tr>
                <td>#${f.tripId}</td>
                <td><strong>${f.driverName || 'Driver'}</strong></td>
                <td>${f.vehicleName || 'Vehicle'}</td>
                <td>${f.liters} Liters</td>
                <td>৳${f.cost.toLocaleString()}</td>
                <td>${f.odometerStart || 0} → ${f.odometerEnd || 0}</td>
                <td><strong>${km} KM</strong></td>
                <td>${f.date || 'Recent'}</td>
              </tr>
            `;
          }).join('')}
        </table>`}
      </div>
    `;
  } else if (currentTab === 'vehicles') {
    const vehicles = db.vehicles || [];
    const avail = vehicles.filter(v => v.status === 'available').length;
    const active = (db.bookings || []).filter(b => b.status === 'active').length;
    const maint = vehicles.filter(v => v.status === 'maintenance').length;

    tabContent = `
      <div class="stats-row">
        <div class="stat-card"><div class="label">Total Fleet</div><div class="value">${vehicles.length}</div><div class="change">Listed vehicles</div></div>
        <div class="stat-card"><div class="label">Available Now</div><div class="value" style="color:var(--success)">${avail}</div><div class="change">Ready for booking</div></div>
        <div class="stat-card"><div class="label">Active on Trip</div><div class="value" style="color:var(--accent)">${active}</div><div class="change">Currently rented</div></div>
        <div class="stat-card"><div class="label">Under Maintenance</div><div class="value" style="color:var(--danger)">${maint}</div><div class="change">Service required</div></div>
      </div>

      <div class="section-card">
        <h3>Vehicle Availability & Rental History</h3>
        <table>
          <tr><th>Vehicle</th><th>Location Hub</th><th>Type & Specs</th><th>Daily Rate</th><th>Completed Trips</th><th>Availability</th><th>Next Booked Slot</th></tr>
          ${vehicles.map(v => {
            const trips = (db.bookings || []).filter(b => b.vehicleId === v.id && b.status === 'completed').length;
            const nextSlot = getNextUnavailableSlot(v.id);
            const slotStr = nextSlot ? `${nextSlot.from} to ${nextSlot.to}` : 'None (Available)';
            return `
              <tr>
                <td>${v.img} <strong>${v.name}</strong></td>
                <td>📍 ${v.location}</td>
                <td>${v.type} (${v.seats}s, ${v.fuel})</td>
                <td>৳${v.price.toLocaleString()}/d</td>
                <td><strong>${trips}</strong></td>
                <td><span class="badge badge-${v.status==='available'?'active':'pending'}">${v.status.toUpperCase()}</span></td>
                <td><span class="slot-badge ${nextSlot?'slot-booked':'slot-avail'}">${slotStr}</span></td>
              </tr>
            `;
          }).join('')}
        </table>
      </div>
    `;
  } else if (currentTab === 'drivers') {
    const drivers = db.drivers || [];

    tabContent = `
      <div class="stats-row">
        <div class="stat-card"><div class="label">Total Drivers</div><div class="value">${drivers.length}</div><div class="change">Enlisted chauffeurs</div></div>
        <div class="stat-card"><div class="label">Active Duty</div><div class="value" style="color:var(--success)">${drivers.filter(d=>d.status==='active').length}</div><div class="change">Ready for dispatch</div></div>
        <div class="stat-card"><div class="label">On Trip</div><div class="value" style="color:var(--accent)">${drivers.filter(d=>d.status==='on-trip').length}</div><div class="change">Driving customer</div></div>
        <div class="stat-card"><div class="label">Leave / Off</div><div class="value" style="color:var(--warning)">${drivers.filter(d=>d.status==='off-duty').length}</div><div class="change">Resting</div></div>
      </div>

      <div class="section-card">
        <h3>Driver Performance & Passenger Ratings</h3>
        <table>
          <tr><th>Driver Name</th><th>License</th><th>Contact</th><th>Trips Conducted</th><th>Avg Rating</th><th>Reviews</th><th>Duty Status</th></tr>
          ${drivers.map(d => {
            const trips = (db.bookings || []).filter(b => b.driverId === d.id && b.status === 'completed').length;
            const avg = getDriverAvgRating(d.id);
            const revCount = getDriverReviews(d.id).length;
            return `
              <tr>
                <td><strong>👨‍✈️ ${d.name}</strong></td>
                <td><code>${d.license}</code></td>
                <td>${d.phone}</td>
                <td>${trips} Trips</td>
                <td><span style="color:#eab308;font-weight:700;">★ ${avg}</span></td>
                <td>${revCount}</td>
                <td><span class="badge badge-${d.status==='active'?'active':d.status==='on-trip'?'approved':'pending'}">${d.status || 'active'}</span></td>
              </tr>
            `;
          }).join('')}
        </table>
      </div>
    `;
  } else if (currentTab === 'maintenance') {
    const reports = db.maintenance_reports || [];
    const openCount = reports.filter(r => r.status !== 'resolved').length;
    const resolvedCount = reports.filter(r => r.status === 'resolved').length;

    tabContent = `
      <div class="stats-row">
        <div class="stat-card"><div class="label">Total Reports</div><div class="value">${reports.length}</div><div class="change">Defect logs</div></div>
        <div class="stat-card"><div class="label">Open Issues</div><div class="value" style="color:var(--danger)">${openCount}</div><div class="change">Awaiting repair</div></div>
        <div class="stat-card"><div class="label">Resolved Issues</div><div class="value" style="color:var(--success)">${resolvedCount}</div><div class="change">Repairs finished</div></div>
      </div>

      <div class="section-card">
        <h3>Vehicle Maintenance & Incident Reports</h3>
        ${reports.length === 0 ? '<p style="color:var(--muted);">No maintenance incidents recorded.</p>' : `
        <table>
          <tr><th>ID</th><th>Vehicle</th><th>Issue</th><th>Severity</th><th>Reported By</th><th>Date</th><th>Status</th></tr>
          ${reports.map(r => `
            <tr>
              <td>#${r.id}</td>
              <td><strong>${r.vehicleName}</strong></td>
              <td>${r.issueType} - ${r.description}</td>
              <td><span class="badge badge-${r.severity==='critical'?'cancelled':'pending'}">${r.severity.toUpperCase()}</span></td>
              <td>${r.reporterName}</td>
              <td>${r.date || 'Recent'}</td>
              <td><span class="badge badge-${r.status==='resolved'?'active':'pending'}">${r.status.toUpperCase()}</span></td>
            </tr>
          `).join('')}
        </table>`}
      </div>
    `;
  } else if (currentTab === 'users') {
    const users = db.users || [];
    const custs = users.filter(u => u.role === 'user').length;
    const drivers = users.filter(u => u.role === 'driver').length;
    const owners = users.filter(u => u.role === 'owner').length;
    const admins = users.filter(u => u.role === 'admin').length;

    tabContent = `
      <div class="stats-row">
        <div class="stat-card"><div class="label">Total Registered</div><div class="value">${users.length}</div><div class="change">System accounts</div></div>
        <div class="stat-card"><div class="label">Customers</div><div class="value" style="color:var(--accent)">${custs}</div><div class="change">Active renters</div></div>
        <div class="stat-card"><div class="label">Drivers</div><div class="value" style="color:var(--accent4)">${drivers}</div><div class="change">Chauffeurs</div></div>
        <div class="stat-card"><div class="label">Fleet Owners</div><div class="value" style="color:var(--accent2)">${owners}</div><div class="change">Vehicle partners</div></div>
        <div class="stat-card"><div class="label">Admins</div><div class="value" style="color:var(--accent3)">${admins}</div><div class="change">System admins</div></div>
      </div>

      <div class="section-card">
        <h3>User Registration Growth</h3>
        <table>
          <tr><th>ID</th><th>Name</th><th>Email</th><th>Role</th><th>Phone</th><th>Status</th><th>Registration Date</th></tr>
          ${[...users].reverse().map(u => `
            <tr>
              <td>#${u.id}</td>
              <td><strong>${u.name}</strong></td>
              <td>${u.email}</td>
              <td><span class="badge badge-approved">${u.role.toUpperCase()}</span></td>
              <td>${u.phone || 'N/A'}</td>
              <td><span class="badge badge-${u.is_verified ? 'active' : 'pending'}">${u.is_verified ? 'Verified' : 'Active'}</span></td>
              <td>${u.createdAt ? new Date(u.createdAt).toLocaleDateString() : '2026-01-01'}</td>
            </tr>
          `).join('')}
        </table>
      </div>
    `;
  } else if (currentTab === 'export') {
    tabContent = `
      <div class="section-card">
        <h3>Data Export Hub (3NF Relational Relays)</h3>
        <p style="color:var(--muted);font-size:.85rem;margin-bottom:20px;">Download complete CSV datasets for business reporting, accounting audits, and external analysis.</p>

        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:16px;">
          <div style="padding:16px;background:var(--surface2);border-radius:10px;border:1px solid var(--border);">
            <h4>📋 Booking Records</h4>
            <p style="color:var(--muted);font-size:.8rem;margin:6px 0 12px;">Full reservation records, passenger details, and trip intervals.</p>
            <button class="btn btn-outline btn-sm btn-full" onclick="exportCSVReport('bookings')">Export Bookings (CSV)</button>
          </div>
          <div style="padding:16px;background:var(--surface2);border-radius:10px;border:1px solid var(--border);">
            <h4>💳 Payment Transactions</h4>
            <p style="color:var(--muted);font-size:.8rem;margin:6px 0 12px;">Revenue receipts, transaction IDs, payment methods, and verification logs.</p>
            <button class="btn btn-outline btn-sm btn-full" onclick="exportCSVReport('payments')">Export Payments (CSV)</button>
          </div>
          <div style="padding:16px;background:var(--surface2);border-radius:10px;border:1px solid var(--border);">
            <h4>⛽ Fuel & Mileage Logs</h4>
            <p style="color:var(--muted);font-size:.8rem;margin:6px 0 12px;">Liters fueled, operational cost, and odometer distance readings.</p>
            <button class="btn btn-outline btn-sm btn-full" onclick="exportCSVReport('fuel')">Export Fuel Logs (CSV)</button>
          </div>
          <div style="padding:16px;background:var(--surface2);border-radius:10px;border:1px solid var(--border);">
            <h4>🚗 Fleet Inventory</h4>
            <p style="color:var(--muted);font-size:.8rem;margin:6px 0 12px;">Vehicle specs, registration numbers, daily rates, and hub distribution.</p>
            <button class="btn btn-outline btn-sm btn-full" onclick="exportCSVReport('vehicles')">Export Fleet (CSV)</button>
          </div>
          <div style="padding:16px;background:var(--surface2);border-radius:10px;border:1px solid var(--border);">
            <h4>🛠️ Maintenance Records</h4>
            <p style="color:var(--muted);font-size:.8rem;margin:6px 0 12px;">Vehicle defect reports, severity rankings, and resolution history.</p>
            <button class="btn btn-outline btn-sm btn-full" onclick="exportCSVReport('maintenance')">Export Defect Logs (CSV)</button>
          </div>
          <div style="padding:16px;background:var(--surface2);border-radius:10px;border:1px solid var(--border);">
            <h4>👥 User Accounts</h4>
            <p style="color:var(--muted);font-size:.8rem;margin:6px 0 12px;">Platform accounts, verification credentials, and roles list.</p>
            <button class="btn btn-outline btn-sm btn-full" onclick="exportCSVReport('users')">Export Users (CSV)</button>
          </div>
        </div>

        <div style="margin-top:24px;padding-top:16px;border-top:1px solid var(--border);display:flex;align-items:center;justify-content:space-between;">
          <div>
            <strong>PDF Executive Report</strong>
            <p style="color:var(--muted);font-size:.8rem;margin-top:2px;">Generate a complete printable summary of current analytics.</p>
          </div>
          <button class="btn btn-accent" onclick="window.print()">🖨️ Print / Save PDF Analytics</button>
        </div>
      </div>
    `;
  }

  return `
    <div class="page-title">Reports & Analytics (3NF Data Models) 📊</div>
    <div class="page-sub">Comprehensive business intelligence across revenue, fuel, vehicles, drivers, and operational metrics</div>

    <!-- SUB-TABS -->
    <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:20px;">
      ${tabs.map(t => `
        <button class="btn ${currentTab === t.id ? 'btn-accent' : 'btn-ghost'} btn-sm" onclick="setAdminReportTab('${t.id}')">
          ${t.label}
        </button>
      `).join('')}
    </div>

    ${tabContent}
  `;
}

function setAdminReportTab(tab) {
  window._adminReportTab = tab;
  loadPage('a_reports');
}

function exportCSVReport(type = 'bookings') {
  let rows = [];
  let filename = 'VRMS_Report.csv';

  if (type === 'bookings') {
    filename = 'VRMS_Bookings_Report.csv';
    rows = [['Booking ID', 'Vehicle', 'Customer', 'Driver', 'From', 'To', 'Days', 'Amount', 'Status']];
    (db.bookings || []).forEach(b => rows.push([b.id, b.vehicleName, b.userName, b.driverName || 'N/A', b.from, b.to, b.days, b.amount, b.status]));
  } else if (type === 'payments') {
    filename = 'VRMS_Payments_Report.csv';
    rows = [['Payment ID', 'Booking ID', 'Customer', 'Vehicle', 'Amount', 'Method', 'Trx ID', 'Status']];
    (db.payments || []).forEach(p => rows.push([p.id, p.bookingId, p.userName, p.vehicleName, p.amount, p.method, p.trxId || 'N/A', p.status]));
  } else if (type === 'fuel') {
    filename = 'VRMS_Fuel_Report.csv';
    rows = [['Log ID', 'Trip ID', 'Driver', 'Vehicle', 'Liters', 'Cost', 'Start Odometer', 'End Odometer', 'Date']];
    (db.fuel_logs || []).forEach(f => rows.push([f.id, f.tripId, f.driverName, f.vehicleName, f.liters, f.cost, f.odometerStart || 0, f.odometerEnd || 0, f.date]));
  } else if (type === 'vehicles') {
    filename = 'VRMS_Vehicles_Report.csv';
    rows = [['Vehicle ID', 'Name', 'Type', 'Hub Location', 'Price Per Day', 'Seats', 'Fuel', 'Reg No', 'Status']];
    (db.vehicles || []).forEach(v => rows.push([v.id, v.name, v.type, v.location, v.price, v.seats, v.fuel, v.regNo || 'N/A', v.status]));
  } else if (type === 'maintenance') {
    filename = 'VRMS_Maintenance_Report.csv';
    rows = [['Report ID', 'Vehicle', 'Issue Type', 'Severity', 'Reporter', 'Date', 'Status']];
    (db.maintenance_reports || []).forEach(m => rows.push([m.id, m.vehicleName, m.issueType, m.severity, m.reporterName, m.date, m.status]));
  } else if (type === 'users') {
    filename = 'VRMS_Users_Report.csv';
    rows = [['User ID', 'Name', 'Email', 'Role', 'Phone', 'Verified', 'Created At']];
    (db.users || []).forEach(u => rows.push([u.id, u.name, u.email, u.role, u.phone || 'N/A', u.is_verified ? 'Yes' : 'No', u.createdAt || 'N/A']));
  }

  const csvContent = rows.map(e => e.map(val => `"${String(val).replace(/"/g, '""')}"`).join(',')).join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  toast(`${filename} downloaded successfully!`, 'ok');
}

// =====================================================================
// HELPERS (MODAL, TOAST, NOTIFICATIONS)
// =====================================================================

function addNotif(to, title, body) {
  db.notifications.push({ id: genId(), to, title, body, date: new Date().toISOString(), read: false });
}

function toast(msg, type) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.className = 'toast ' + (type || '');
  el.classList.add('show');
  setTimeout(() => el.classList.remove('show'), 3000);
}

function openModal(title, sub, body, onConfirm) {
  document.getElementById('modalTitle').textContent = title;
  document.getElementById('modalBody').innerHTML = body;
  document.getElementById('modalConfirm').onclick = onConfirm;
  document.getElementById('modalOverlay').classList.add('open');
}

function closeModal() {
  document.getElementById('modalOverlay').classList.remove('open');
}

document.getElementById('modalOverlay').addEventListener('click', function(e) {
  if (e.target === this) closeModal();
});

// Auto-restore session
window.addEventListener('load', () => {
  if (currentUser) loadDashboard();
});