-- =====================================================================
-- Vehicle Rental Management System (VRMS)
-- Unified Complete Database Script (3NF Schema, Seed Data & Analytical Queries)
-- DBMS: MySQL 8.0+ / MariaDB 10.4+
-- Generated for Project Presentation & Production Deployment
-- =====================================================================

DROP DATABASE IF EXISTS `vrms_db`;
CREATE DATABASE `vrms_db` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `vrms_db`;

-- =====================================================================
-- PART 1: 3NF RELATIONAL SCHEMA DEFINITION
-- =====================================================================

-- ---------------------------------------------------------------------
-- Table 1: roles
-- 3NF: Stores user role definitions independently (No transitive dependency)
-- ---------------------------------------------------------------------
CREATE TABLE `roles` (
    `role_id` INT AUTO_INCREMENT PRIMARY KEY,
    `role_name` VARCHAR(50) NOT NULL UNIQUE,
    `description` VARCHAR(255) NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- Table 2: locations
-- 3NF: Normalizes pickup/dropoff branches & hubs (Eliminates repeated strings)
-- ---------------------------------------------------------------------
CREATE TABLE `locations` (
    `location_id` INT AUTO_INCREMENT PRIMARY KEY,
    `hub_name` VARCHAR(100) NOT NULL,
    `city` VARCHAR(50) NOT NULL,
    `address` VARCHAR(255) NOT NULL,
    `contact_phone` VARCHAR(20) NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX `idx_city` (`city`)
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- Table 3: users
-- 3NF: Atomic user credentials, role reference and personal info
-- ---------------------------------------------------------------------
CREATE TABLE `users` (
    `user_id` INT AUTO_INCREMENT PRIMARY KEY,
    `role_id` INT NOT NULL,
    `full_name` VARCHAR(100) NOT NULL,
    `email` VARCHAR(120) NOT NULL UNIQUE,
    `phone` VARCHAR(20) NOT NULL,
    `password_hash` VARCHAR(255) NOT NULL,
    `status` ENUM('active', 'suspended', 'pending') DEFAULT 'active',
    `verification_status` ENUM('unverified', 'pending', 'verified') DEFAULT 'verified',
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT `fk_users_role` FOREIGN KEY (`role_id`) REFERENCES `roles` (`role_id`) ON DELETE RESTRICT ON UPDATE CASCADE,
    INDEX `idx_user_email` (`email`)
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- Table 4: vehicles
-- 3NF: Core vehicle fleet records with location and owner links
-- ---------------------------------------------------------------------
CREATE TABLE `vehicles` (
    `vehicle_id` INT AUTO_INCREMENT PRIMARY KEY,
    `owner_id` INT NULL,
    `location_id` INT NOT NULL,
    `model_name` VARCHAR(100) NOT NULL,
    `vehicle_type` ENUM('Sedan', 'SUV', 'Minibus', 'Truck', 'Motorcycle', 'Van') NOT NULL,
    `registration_no` VARCHAR(50) NOT NULL UNIQUE,
    `daily_rate` DECIMAL(10, 2) NOT NULL CHECK (`daily_rate` > 0),
    `seats` INT NOT NULL DEFAULT 4 CHECK (`seats` > 0),
    `fuel_type` ENUM('Petrol', 'Octane', 'Diesel', 'Electric', 'Hybrid', 'CNG') NOT NULL,
    `image_icon` VARCHAR(50) DEFAULT '🚗',
    `status` ENUM('available', 'rented', 'maintenance', 'unavailable') DEFAULT 'available',
    `is_verified` BOOLEAN DEFAULT TRUE,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT `fk_vehicles_owner` FOREIGN KEY (`owner_id`) REFERENCES `users` (`user_id`) ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT `fk_vehicles_location` FOREIGN KEY (`location_id`) REFERENCES `locations` (`location_id`) ON DELETE RESTRICT ON UPDATE CASCADE,
    INDEX `idx_vehicle_status` (`status`),
    INDEX `idx_vehicle_type` (`vehicle_type`),
    INDEX `idx_vehicle_location` (`location_id`)
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- Table 5: drivers
-- 3NF: Driver-specific attributes linked to user record (1:1 with user)
-- ---------------------------------------------------------------------
CREATE TABLE `drivers` (
    `driver_id` INT AUTO_INCREMENT PRIMARY KEY,
    `user_id` INT NOT NULL UNIQUE,
    `owner_id` INT NULL,
    `license_number` VARCHAR(50) NOT NULL UNIQUE,
    `experience_years` INT DEFAULT 1,
    `assigned_vehicle_id` INT NULL,
    `driver_status` ENUM('active', 'on_trip', 'on_leave', 'inactive') DEFAULT 'active',
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT `fk_drivers_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT `fk_drivers_owner` FOREIGN KEY (`owner_id`) REFERENCES `users` (`user_id`) ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT `fk_drivers_vehicle` FOREIGN KEY (`assigned_vehicle_id`) REFERENCES `vehicles` (`vehicle_id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- Table 6: trips_bookings
-- 3NF: Rental reservations and trip records
-- ---------------------------------------------------------------------
CREATE TABLE `trips_bookings` (
    `booking_id` INT AUTO_INCREMENT PRIMARY KEY,
    `customer_id` INT NOT NULL,
    `vehicle_id` INT NOT NULL,
    `driver_id` INT NULL,
    `pickup_location_id` INT NOT NULL,
    `dropoff_location_id` INT NOT NULL,
    `start_date` DATE NOT NULL,
    `end_date` DATE NOT NULL,
    `total_days` INT GENERATED ALWAYS AS (DATEDIFF(`end_date`, `start_date`)) STORED,
    `daily_rate` DECIMAL(10, 2) NOT NULL,
    `total_amount` DECIMAL(10, 2) NOT NULL,
    `booking_status` ENUM('pending', 'approved', 'active', 'completed', 'cancelled') DEFAULT 'pending',
    `trip_odometer_start` INT NULL,
    `trip_odometer_end` INT NULL,
    `special_notes` TEXT NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT `chk_booking_dates` CHECK (`end_date` > `start_date`),
    CONSTRAINT `fk_bookings_customer` FOREIGN KEY (`customer_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT `fk_bookings_vehicle` FOREIGN KEY (`vehicle_id`) REFERENCES `vehicles` (`vehicle_id`) ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT `fk_bookings_driver` FOREIGN KEY (`driver_id`) REFERENCES `drivers` (`driver_id`) ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT `fk_bookings_pickup_loc` FOREIGN KEY (`pickup_location_id`) REFERENCES `locations` (`location_id`) ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT `fk_bookings_drop_loc` FOREIGN KEY (`dropoff_location_id`) REFERENCES `locations` (`location_id`) ON DELETE RESTRICT ON UPDATE CASCADE,
    INDEX `idx_booking_dates` (`vehicle_id`, `start_date`, `end_date`),
    INDEX `idx_booking_status` (`booking_status`)
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- Table 7: payments
-- 3NF: Digital and offline financial transactions
-- ---------------------------------------------------------------------
CREATE TABLE `payments` (
    `payment_id` INT AUTO_INCREMENT PRIMARY KEY,
    `booking_id` INT NOT NULL,
    `customer_id` INT NOT NULL,
    `payment_method` ENUM('bKash', 'Nagad', 'Rocket', 'Credit Card', 'Debit Card', 'Bank Transfer', 'Cash') NOT NULL,
    `transaction_id` VARCHAR(100) NOT NULL UNIQUE,
    `amount` DECIMAL(10, 2) NOT NULL CHECK (`amount` > 0),
    `payment_status` ENUM('pending', 'approved', 'rejected', 'refunded') DEFAULT 'pending',
    `payment_date` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT `fk_payments_booking` FOREIGN KEY (`booking_id`) REFERENCES `trips_bookings` (`booking_id`) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT `fk_payments_customer` FOREIGN KEY (`customer_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE ON UPDATE CASCADE,
    INDEX `idx_payment_status` (`payment_status`)
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- Table 8: reviews (Driver + Vehicle Review)
-- 3NF: Dual rating and feedback for vehicle & assigned driver
-- ---------------------------------------------------------------------
CREATE TABLE `reviews` (
    `review_id` INT AUTO_INCREMENT PRIMARY KEY,
    `booking_id` INT NOT NULL UNIQUE,
    `customer_id` INT NOT NULL,
    `vehicle_id` INT NOT NULL,
    `driver_id` INT NULL,
    `vehicle_rating` TINYINT NOT NULL CHECK (`vehicle_rating` BETWEEN 1 AND 5),
    `vehicle_comment` TEXT NULL,
    `driver_rating` TINYINT NULL CHECK (`driver_rating` BETWEEN 1 AND 5),
    `driver_comment` TEXT NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT `fk_reviews_booking` FOREIGN KEY (`booking_id`) REFERENCES `trips_bookings` (`booking_id`) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT `fk_reviews_customer` FOREIGN KEY (`customer_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT `fk_reviews_vehicle` FOREIGN KEY (`vehicle_id`) REFERENCES `vehicles` (`vehicle_id`) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT `fk_reviews_driver` FOREIGN KEY (`driver_id`) REFERENCES `drivers` (`driver_id`) ON DELETE SET NULL ON UPDATE CASCADE,
    INDEX `idx_reviews_vehicle` (`vehicle_id`),
    INDEX `idx_reviews_driver` (`driver_id`)
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- Table 9: maintenance_reports
-- 3NF: Vehicle problem logging, status and resolution costs
-- ---------------------------------------------------------------------
CREATE TABLE `maintenance_reports` (
    `report_id` INT AUTO_INCREMENT PRIMARY KEY,
    `vehicle_id` INT NOT NULL,
    `reported_by` INT NOT NULL,
    `issue_type` ENUM('Engine', 'Brake', 'Tire', 'Battery', 'AC / Heating', 'Body / Dent', 'Electrical', 'Other') NOT NULL,
    `severity` ENUM('low', 'medium', 'high', 'critical') DEFAULT 'medium',
    `description` TEXT NOT NULL,
    `repair_cost` DECIMAL(10, 2) DEFAULT 0.00 CHECK (`repair_cost` >= 0),
    `status` ENUM('reported', 'under_review', 'in_progress', 'resolved') DEFAULT 'reported',
    `reported_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `resolved_at` TIMESTAMP NULL,
    CONSTRAINT `fk_maint_vehicle` FOREIGN KEY (`vehicle_id`) REFERENCES `vehicles` (`vehicle_id`) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT `fk_maint_reporter` FOREIGN KEY (`reported_by`) REFERENCES `users` (`user_id`) ON DELETE CASCADE ON UPDATE CASCADE,
    INDEX `idx_maint_status` (`status`)
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- Table 10: fuel_logs
-- 3NF: Trip fuel expenses, odometer logging and mileage tracking
-- ---------------------------------------------------------------------
CREATE TABLE `fuel_logs` (
    `fuel_log_id` INT AUTO_INCREMENT PRIMARY KEY,
    `vehicle_id` INT NOT NULL,
    `driver_id` INT NOT NULL,
    `booking_id` INT NULL,
    `log_date` DATE NOT NULL,
    `odometer_reading` INT NOT NULL CHECK (`odometer_reading` >= 0),
    `fuel_liters` DECIMAL(8, 2) NOT NULL CHECK (`fuel_liters` > 0),
    `total_cost` DECIMAL(10, 2) NOT NULL CHECK (`total_cost` > 0),
    `fuel_station` VARCHAR(100) NULL,
    `notes` VARCHAR(255) NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT `fk_fuel_vehicle` FOREIGN KEY (`vehicle_id`) REFERENCES `vehicles` (`vehicle_id`) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT `fk_fuel_driver` FOREIGN KEY (`driver_id`) REFERENCES `drivers` (`driver_id`) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT `fk_fuel_booking` FOREIGN KEY (`booking_id`) REFERENCES `trips_bookings` (`booking_id`) ON DELETE SET NULL ON UPDATE CASCADE,
    INDEX `idx_fuel_vehicle` (`vehicle_id`)
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- Table 11: complaints (Customer, Driver & Owner Support Tickets)
-- 3NF: Support requests, complaint categorization & admin resolutions
-- ---------------------------------------------------------------------
CREATE TABLE `complaints` (
    `complaint_id` INT AUTO_INCREMENT PRIMARY KEY,
    `user_id` INT NOT NULL,
    `role_type` ENUM('customer', 'driver', 'owner') NOT NULL,
    `booking_id` INT NULL,
    `subject` VARCHAR(150) NOT NULL,
    `description` TEXT NOT NULL,
    `status` ENUM('open', 'in_progress', 'resolved', 'dismissed') DEFAULT 'open',
    `admin_resolution` TEXT NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `resolved_at` TIMESTAMP NULL,
    CONSTRAINT `fk_complaints_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT `fk_complaints_booking` FOREIGN KEY (`booking_id`) REFERENCES `trips_bookings` (`booking_id`) ON DELETE SET NULL ON UPDATE CASCADE,
    INDEX `idx_complaint_status` (`status`)
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- Table 12: driver_leaves (Driver Availability & Leave Management)
-- 3NF: Structured leave requests, dates, and administrative approvals
-- ---------------------------------------------------------------------
CREATE TABLE `driver_leaves` (
    `leave_id` INT AUTO_INCREMENT PRIMARY KEY,
    `driver_id` INT NOT NULL,
    `start_date` DATE NOT NULL,
    `end_date` DATE NOT NULL,
    `reason` VARCHAR(255) NOT NULL,
    `status` ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
    `admin_remarks` VARCHAR(255) NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT `fk_leaves_driver` FOREIGN KEY (`driver_id`) REFERENCES `drivers` (`driver_id`) ON DELETE CASCADE ON UPDATE CASCADE,
    INDEX `idx_leave_dates` (`driver_id`, `start_date`, `end_date`)
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- Table 13: vehicle_documents (Registration, Insurance, Fitness & Tax Tokens)
-- 3NF: Independent document records and compliance tracking
-- ---------------------------------------------------------------------
CREATE TABLE `vehicle_documents` (
    `doc_id` INT AUTO_INCREMENT PRIMARY KEY,
    `vehicle_id` INT NOT NULL,
    `doc_type` ENUM('Registration Certificate', 'Insurance Policy', 'Tax Token', 'Fitness Certificate') NOT NULL,
    `doc_number` VARCHAR(100) NOT NULL,
    `expiry_date` DATE NOT NULL,
    `verification_status` ENUM('pending', 'verified', 'rejected', 'expired') DEFAULT 'verified',
    `file_url` VARCHAR(255) NULL,
    `uploaded_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT `fk_docs_vehicle` FOREIGN KEY (`vehicle_id`) REFERENCES `vehicles` (`vehicle_id`) ON DELETE CASCADE ON UPDATE CASCADE,
    INDEX `idx_doc_expiry` (`expiry_date`)
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- Table 14: announcements (Notification Center Broadcasts)
-- 3NF: System announcements, target roles, and categories
-- ---------------------------------------------------------------------
CREATE TABLE `announcements` (
    `announcement_id` INT AUTO_INCREMENT PRIMARY KEY,
    `target_role` ENUM('all', 'user', 'driver', 'owner') DEFAULT 'all',
    `title` VARCHAR(150) NOT NULL,
    `message` TEXT NOT NULL,
    `category` ENUM('General', 'Emergency', 'Promotional', 'Maintenance') DEFAULT 'General',
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- =====================================================================
-- PART 2: SEED DATA & INITIAL CONFIGURATION
-- =====================================================================

-- Insert Roles
INSERT INTO `roles` (`role_id`, `role_name`, `description`) VALUES
(1, 'admin', 'Full system control, reports, and payment approvals'),
(2, 'owner', 'Vehicle fleet owner managing cars, drivers and requests'),
(3, 'driver', 'Assigned driver handling trips, fuel logs and vehicle reports'),
(4, 'user', 'Individual rental customer booking cars');

-- Insert Locations / Hubs
INSERT INTO `locations` (`location_id`, `hub_name`, `city`, `address`, `contact_phone`) VALUES
(1, 'Banani Hub', 'Dhaka', 'Road 11, Block D, Banani, Dhaka-1213', '+8801711000001'),
(2, 'Dhanmondi Hub', 'Dhaka', 'Satmasjid Road, Dhanmondi 27, Dhaka-1209', '+8801711000002'),
(3, 'Uttara Terminal', 'Dhaka', 'Sector 3, Jashimuddin Ave, Uttara, Dhaka-1230', '+8801711000003'),
(4, 'GEC Circle Branch', 'Chittagong', 'GEC Circle, Nasirabad, Chittagong', '+8801711000004'),
(5, 'Zindabazar Hub', 'Sylhet', 'Zindabazar Point, East Zindabazar, Sylhet', '+8801711000005'),
(6, 'Kolatoli Point', 'Cox''s Bazar', 'Marine Drive Road, Kolatoli, Cox''s Bazar', '+8801711000006');

-- Insert Primary System Administrator
-- Sole Admin: Email: 2023100000502@seu.edu.bd | Password: @Sadia2026
INSERT INTO `users` (`user_id`, `role_id`, `full_name`, `email`, `phone`, `password_hash`, `status`, `verification_status`) VALUES
(1, 1, 'Sadia Rahman (Admin)', '2023100000502@seu.edu.bd', '+8801700000502', 'a2b913def6a978a862231a3ed8a849f015cbdd41d89c111a40922bc5884e1f0e', 'active', 'verified');

-- Insert Initial Fleet Vehicles (Available across hubs)
INSERT INTO `vehicles` (`vehicle_id`, `owner_id`, `location_id`, `model_name`, `vehicle_type`, `registration_no`, `daily_rate`, `seats`, `fuel_type`, `image_icon`, `status`, `is_verified`) VALUES
(1, NULL, 1, 'Toyota Corolla Altis 2022', 'Sedan', 'DHK-MET-GA-11-2022', 3500.00, 5, 'Octane', '🚘', 'available', TRUE),
(2, NULL, 2, 'Hyundai Tucson AWD', 'SUV', 'DHK-MET-GHA-22-3033', 5500.00, 7, 'Diesel', '🚙', 'available', TRUE),
(3, NULL, 3, 'Toyota Hiace Grand Cabin', 'Van', 'DHK-MET-CHA-33-4044', 6500.00, 14, 'Octane', '🚐', 'available', TRUE),
(4, NULL, 4, 'Mitsubishi Rosa Luxury Bus', 'Minibus', 'CTG-MET-BA-44-5055', 8000.00, 26, 'Diesel', '🚌', 'available', TRUE),
(5, NULL, 1, 'Honda CB 150R Streetfire', 'Motorcycle', 'DHK-MET-HA-55-6066', 1200.00, 2, 'Octane', '🏍️', 'available', TRUE),
(6, NULL, 5, 'Toyota Land Cruiser Prado', 'SUV', 'SYL-MET-GHA-66-7077', 11000.00, 7, 'Diesel', '🚙', 'available', TRUE);

-- Seed Initial Vehicle Documents
INSERT INTO `vehicle_documents` (`vehicle_id`, `doc_type`, `doc_number`, `expiry_date`, `verification_status`) VALUES
(1, 'Registration Certificate', 'BRTA-REG-GA-11-2022', '2028-12-31', 'verified'),
(1, 'Insurance Policy', 'INS-GREEN-99210-26', '2027-04-15', 'verified'),
(1, 'Tax Token', 'TT-2026-88129', '2026-11-30', 'verified'),
(1, 'Fitness Certificate', 'FIT-DHK-44120', '2027-02-28', 'verified'),
(2, 'Insurance Policy', 'INS-DELTA-33100-26', '2026-10-15', 'verified');

-- =====================================================================
-- PART 3: BUSINESS ANALYTICAL & OPERATIONAL QUERIES
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Location-Wise Vehicle Search with Filters (City, Vehicle Type, Max Price)
-- ---------------------------------------------------------------------
SELECT 
    v.vehicle_id,
    v.model_name,
    v.vehicle_type,
    v.registration_no,
    v.daily_rate,
    v.seats,
    v.fuel_type,
    v.image_icon,
    v.status,
    l.hub_name,
    l.city,
    l.address,
    COALESCE(ROUND(AVG(r.vehicle_rating), 1), 5.0) AS avg_vehicle_rating,
    COUNT(r.review_id) AS total_reviews
FROM vehicles v
JOIN locations l ON v.location_id = l.location_id
LEFT JOIN reviews r ON v.vehicle_id = r.vehicle_id
WHERE v.status = 'available'
  AND (l.city = 'Dhaka' OR 'Dhaka' IS NULL)
  AND (v.vehicle_type = 'Sedan' OR 'Sedan' IS NULL)
  AND v.daily_rate <= 5000.00
GROUP BY v.vehicle_id, l.location_id
ORDER BY v.daily_rate ASC;

-- ---------------------------------------------------------------------
-- 2. Query Next Unavailable Slot of a Car (Upcoming Bookings)
-- Finds the next earliest booking for each vehicle that makes it unavailable
-- ---------------------------------------------------------------------
SELECT 
    v.vehicle_id,
    v.model_name,
    v.registration_no,
    b.booking_id,
    b.start_date AS unavailable_from,
    b.end_date AS unavailable_to,
    DATEDIFF(b.end_date, b.start_date) AS booked_days,
    b.booking_status,
    CASE 
        WHEN CURRENT_DATE BETWEEN b.start_date AND b.end_date THEN 'Currently On Trip'
        WHEN b.start_date > CURRENT_DATE THEN CONCAT('Next Booked: ', b.start_date, ' to ', b.end_date)
        ELSE 'Available Now'
    END AS availability_summary
FROM vehicles v
LEFT JOIN trips_bookings b ON v.vehicle_id = b.vehicle_id 
    AND b.booking_status IN ('approved', 'active', 'pending')
    AND b.end_date >= CURRENT_DATE
WHERE v.vehicle_id = 1
ORDER BY b.start_date ASC
LIMIT 1;

-- ---------------------------------------------------------------------
-- 3. Check for Overlapping Booking Before Reservation (Conflict Detection)
-- Returns count > 0 if the vehicle is already booked in that date interval
-- ---------------------------------------------------------------------
-- Parameters: @veh_id = 1, @req_start = '2026-10-06', @req_end = '2026-10-09'
SELECT COUNT(*) AS conflict_count
FROM trips_bookings
WHERE vehicle_id = 1
  AND booking_status IN ('approved', 'active', 'pending')
  AND ('2026-10-06' < end_date AND '2026-10-09' > start_date);

-- ---------------------------------------------------------------------
-- 4. Customer Rental & Travel History
-- Complete travel record with vehicle, driver, payment, and review details
-- ---------------------------------------------------------------------
SELECT 
    b.booking_id,
    v.model_name AS vehicle_name,
    v.registration_no,
    u_driver.full_name AS driver_name,
    l_pick.hub_name AS pickup_hub,
    l_drop.hub_name AS dropoff_hub,
    b.start_date,
    b.end_date,
    b.total_days,
    b.total_amount,
    b.booking_status,
    p.payment_status,
    p.payment_method,
    p.transaction_id,
    r.vehicle_rating,
    r.driver_rating,
    r.vehicle_comment
FROM trips_bookings b
JOIN vehicles v ON b.vehicle_id = v.vehicle_id
LEFT JOIN drivers d ON b.driver_id = d.driver_id
LEFT JOIN users u_driver ON d.user_id = u_driver.user_id
JOIN locations l_pick ON b.pickup_location_id = l_pick.location_id
JOIN locations l_drop ON b.dropoff_location_id = l_drop.location_id
LEFT JOIN payments p ON b.booking_id = p.booking_id
LEFT JOIN reviews r ON b.booking_id = r.booking_id
WHERE b.customer_id = 4
ORDER BY b.created_at DESC;

-- ---------------------------------------------------------------------
-- 5. Business Insight: Monthly Revenue & Payment Method Breakdown
-- ---------------------------------------------------------------------
SELECT 
    DATE_FORMAT(payment_date, '%Y-%m') AS revenue_month,
    payment_method,
    COUNT(payment_id) AS total_transactions,
    SUM(amount) AS monthly_revenue
FROM payments
WHERE payment_status = 'approved'
GROUP BY DATE_FORMAT(payment_date, '%Y-%m'), payment_method
ORDER BY revenue_month DESC, monthly_revenue DESC;

-- ---------------------------------------------------------------------
-- 6. Business Insight: Vehicle Fleet Utilization & Revenue Performance
-- ---------------------------------------------------------------------
SELECT 
    v.vehicle_id,
    v.model_name,
    v.vehicle_type,
    COUNT(b.booking_id) AS total_trips,
    COALESCE(SUM(b.total_days), 0) AS total_rental_days,
    COALESCE(SUM(p.amount), 0.00) AS total_revenue_generated,
    COALESCE(ROUND(AVG(r.vehicle_rating), 2), 0.00) AS avg_vehicle_rating,
    COALESCE(SUM(m.repair_cost), 0.00) AS total_maintenance_cost,
    (COALESCE(SUM(p.amount), 0.00) - COALESCE(SUM(m.repair_cost), 0.00)) AS net_profit
FROM vehicles v
LEFT JOIN trips_bookings b ON v.vehicle_id = b.vehicle_id AND b.booking_status IN ('approved', 'active', 'completed')
LEFT JOIN payments p ON b.booking_id = p.booking_id AND p.payment_status = 'approved'
LEFT JOIN reviews r ON v.vehicle_id = r.vehicle_id
LEFT JOIN maintenance_reports m ON v.vehicle_id = m.vehicle_id
GROUP BY v.vehicle_id
ORDER BY total_revenue_generated DESC;

-- ---------------------------------------------------------------------
-- 7. Driver Performance, Review & Ratings Leaderboard
-- ---------------------------------------------------------------------
SELECT 
    d.driver_id,
    u.full_name AS driver_name,
    d.license_number,
    d.experience_years,
    d.driver_status,
    COUNT(DISTINCT b.booking_id) AS completed_trips,
    COALESCE(ROUND(AVG(r.driver_rating), 2), 5.00) AS avg_driver_rating,
    COUNT(r.review_id) AS total_reviews_received
FROM drivers d
JOIN users u ON d.user_id = u.user_id
LEFT JOIN trips_bookings b ON d.driver_id = b.driver_id AND b.booking_status = 'completed'
LEFT JOIN reviews r ON d.driver_id = r.driver_id
GROUP BY d.driver_id, u.user_id
ORDER BY avg_driver_rating DESC, completed_trips DESC;

-- ---------------------------------------------------------------------
-- 8. Driver Fuel Usage & Mileage Efficiency (km per Liter)
-- ---------------------------------------------------------------------
SELECT 
    fl.fuel_log_id,
    v.model_name,
    u_driver.full_name AS driver_name,
    fl.log_date,
    fl.odometer_reading,
    fl.fuel_liters,
    fl.total_cost,
    ROUND(fl.total_cost / fl.fuel_liters, 2) AS price_per_liter,
    fl.fuel_station
FROM fuel_logs fl
JOIN vehicles v ON fl.vehicle_id = v.vehicle_id
JOIN drivers d ON fl.driver_id = d.driver_id
JOIN users u_driver ON d.user_id = u_driver.user_id
ORDER BY fl.log_date DESC;

-- ---------------------------------------------------------------------
-- 9. Active Vehicle Defect & Maintenance Status Report
-- ---------------------------------------------------------------------
SELECT 
    m.report_id,
    v.model_name,
    v.registration_no,
    u.full_name AS reported_by,
    m.issue_type,
    m.severity,
    m.description,
    m.repair_cost,
    m.status,
    m.reported_at
FROM maintenance_reports m
JOIN vehicles v ON m.vehicle_id = v.vehicle_id
JOIN users u ON m.reported_by = u.user_id
WHERE m.status != 'resolved'
ORDER BY 
    CASE m.severity 
        WHEN 'critical' THEN 1 
        WHEN 'high' THEN 2 
        WHEN 'medium' THEN 3 
        ELSE 4 
    END, 
    m.reported_at ASC;

-- ---------------------------------------------------------------------
-- 10. Complaint Management & Support Ticket Resolution
-- Filters active complaints by role with reporter and booking details
-- ---------------------------------------------------------------------
SELECT 
    c.complaint_id,
    c.role_type,
    u.full_name AS reporter_name,
    u.email AS reporter_email,
    c.booking_id,
    c.subject,
    c.description,
    c.status,
    c.admin_resolution,
    c.created_at,
    c.resolved_at
FROM complaints c
JOIN users u ON c.user_id = u.user_id
ORDER BY 
    CASE c.status 
        WHEN 'open' THEN 1 
        WHEN 'in_progress' THEN 2 
        ELSE 3 
    END, 
    c.created_at DESC;

-- ---------------------------------------------------------------------
-- 11. Driver Availability, Leave Schedule & Duty Status
-- Lists driver statuses, on-leave intervals, and current assignments
-- ---------------------------------------------------------------------
SELECT 
    d.driver_id,
    u.full_name AS driver_name,
    d.license_number,
    d.driver_status,
    l.start_date AS on_leave_from,
    l.end_date AS on_leave_to,
    l.status AS leave_status,
    l.reason AS leave_reason
FROM drivers d
JOIN users u ON d.user_id = u.user_id
LEFT JOIN driver_leaves l ON d.driver_id = l.driver_id 
    AND l.status = 'approved' 
    AND CURRENT_DATE BETWEEN l.start_date AND l.end_date
ORDER BY d.driver_status ASC, u.full_name ASC;

-- ---------------------------------------------------------------------
-- 12. Fleet Vehicle Compliance & Document Expiry Warning
-- Alerts fleet owners & admin when documents expire within 60 days
-- ---------------------------------------------------------------------
SELECT 
    v.vehicle_id,
    v.model_name,
    v.registration_no,
    u_owner.full_name AS owner_name,
    vd.doc_type,
    vd.doc_number,
    vd.expiry_date,
    DATEDIFF(vd.expiry_date, CURRENT_DATE) AS days_until_expiry,
    CASE 
        WHEN vd.expiry_date < CURRENT_DATE THEN 'EXPIRED'
        WHEN DATEDIFF(vd.expiry_date, CURRENT_DATE) <= 30 THEN 'CRITICAL (Expires < 30 days)'
        WHEN DATEDIFF(vd.expiry_date, CURRENT_DATE) <= 60 THEN 'WARNING (Expires < 60 days)'
        ELSE 'VALID'
    END AS compliance_status
FROM vehicle_documents vd
JOIN vehicles v ON vd.vehicle_id = v.vehicle_id
LEFT JOIN users u_owner ON v.owner_id = u_owner.user_id
ORDER BY days_until_expiry ASC;
