-- Fleet Earnings Management System - PostgreSQL Schema
-- This schema defines the complete database structure for production

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  role VARCHAR(20) NOT NULL CHECK (role IN ('Owner', 'Driver')),
  status VARCHAR(20) NOT NULL DEFAULT 'Active' CHECK (status IN ('Active', 'Disabled')),
  password_hash VARCHAR(255) NOT NULL,
  assigned_vehicle_id UUID,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Vehicles table
CREATE TABLE IF NOT EXISTS vehicles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_number VARCHAR(50) UNIQUE NOT NULL,
  vehicle_name VARCHAR(255) NOT NULL,
  brand VARCHAR(100),
  model VARCHAR(100),
  insurance_expiry DATE,
  assigned_driver_id UUID REFERENCES users(id) ON DELETE SET NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'Active' CHECK (status IN ('Active', 'Maintenance', 'Inactive')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Commission Settings table
CREATE TABLE IF NOT EXISTS commission_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  threshold NUMERIC(10, 2) NOT NULL,
  below_threshold_percent NUMERIC(5, 2) NOT NULL,
  above_threshold_percent NUMERIC(5, 2) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Daily Reports table
CREATE TABLE IF NOT EXISTS daily_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  driver_name VARCHAR(255) NOT NULL,
  report_date DATE NOT NULL,
  vehicle_id UUID NOT NULL REFERENCES vehicles(id) ON DELETE RESTRICT,
  vehicle_number VARCHAR(50) NOT NULL,
  
  -- Rides
  ola_rides INTEGER DEFAULT 0,
  uber_rides INTEGER DEFAULT 0,
  rapido_rides INTEGER DEFAULT 0,
  other_rides INTEGER DEFAULT 0,
  total_rides INTEGER DEFAULT 0,
  
  -- Earnings
  ola_earnings NUMERIC(10, 2) DEFAULT 0,
  uber_earnings NUMERIC(10, 2) DEFAULT 0,
  rapido_earnings NUMERIC(10, 2) DEFAULT 0,
  other_earnings NUMERIC(10, 2) DEFAULT 0,
  total_earnings NUMERIC(10, 2) DEFAULT 0,
  
  -- Commission
  commission_percent NUMERIC(5, 2) DEFAULT 0,
  commission_amount NUMERIC(10, 2) DEFAULT 0,
  
  -- Fuel
  fuel_paid_by VARCHAR(20) NOT NULL DEFAULT 'Driver' CHECK (fuel_paid_by IN ('Driver', 'Owner')),
  fuel_type VARCHAR(20) NOT NULL DEFAULT 'CNG' CHECK (fuel_type IN ('CNG', 'Petrol', 'Diesel')),
  fuel_amount NUMERIC(10, 2) DEFAULT 0,
  
  -- Settlement
  driver_keeps NUMERIC(10, 2) DEFAULT 0,
  owner_due NUMERIC(10, 2) DEFAULT 0,
  settlement_status VARCHAR(20) DEFAULT 'Pending' CHECK (settlement_status IN ('Pending', 'Paid')),
  amount_collected NUMERIC(10, 2),
  pending_amount NUMERIC(10, 2),
  
  -- Distance Tracking
  starting_km NUMERIC(10, 2),
  ending_km NUMERIC(10, 2),
  total_distance NUMERIC(10, 2),
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(driver_id, report_date)
);

-- Settlement Payment History
CREATE TABLE IF NOT EXISTS settlement_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID NOT NULL REFERENCES daily_reports(id) ON DELETE CASCADE,
  amount NUMERIC(10, 2) NOT NULL,
  payment_date DATE NOT NULL,
  payment_method VARCHAR(50) NOT NULL CHECK (payment_method IN ('Cash', 'UPI', 'Bank Transfer')),
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Report Images
CREATE TABLE IF NOT EXISTS report_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID NOT NULL REFERENCES daily_reports(id) ON DELETE CASCADE,
  image_name VARCHAR(255) NOT NULL,
  image_url TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Audit Logs for security and compliance
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  action VARCHAR(255) NOT NULL,
  entity_type VARCHAR(100),
  entity_id UUID,
  old_values JSONB,
  new_values JSONB,
  ip_address VARCHAR(45),
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indices for performance
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_vehicles_assigned_driver ON vehicles(assigned_driver_id);
CREATE INDEX IF NOT EXISTS idx_vehicles_status ON vehicles(status);
CREATE INDEX IF NOT EXISTS idx_reports_driver ON daily_reports(driver_id);
CREATE INDEX IF NOT EXISTS idx_reports_date ON daily_reports(report_date);
CREATE INDEX IF NOT EXISTS idx_reports_vehicle ON daily_reports(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_reports_settlement ON daily_reports(settlement_status);
CREATE INDEX IF NOT EXISTS idx_payments_report ON settlement_payments(report_id);
CREATE INDEX IF NOT EXISTS idx_audit_user ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_logs(created_at);
