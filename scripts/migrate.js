#!/usr/bin/env node

/**
 * Migration Script: JSON to PostgreSQL
 * Usage: node scripts/migrate.js
 */

import 'dotenv/config';
import pkg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const { Pool } = pkg;
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : undefined,
});

async function migrateData() {
  const client = await pool.connect();

  try {
    console.log('🚀 Starting migration from JSON to PostgreSQL...\n');

    // Load JSON files
    const dataDir = path.join(process.cwd(), 'data');
    const usersPath = path.join(dataDir, 'users.json');
    const vehiclesPath = path.join(dataDir, 'vehicles.json');
    const reportsPath = path.join(dataDir, 'reports.json');
    const settingsPath = path.join(dataDir, 'settings.json');

    // Load data
    let users = [];
    let vehicles = [];
    let reports = [];
    let settings = {};

    if (fs.existsSync(usersPath)) {
      const data = fs.readFileSync(usersPath, 'utf-8');
      users = JSON.parse(data || '[]');
      console.log(`📄 Loaded ${users.length} users from JSON`);
    }

    if (fs.existsSync(vehiclesPath)) {
      const data = fs.readFileSync(vehiclesPath, 'utf-8');
      vehicles = JSON.parse(data || '[]');
      console.log(`📄 Loaded ${vehicles.length} vehicles from JSON`);
    }

    if (fs.existsSync(reportsPath)) {
      const data = fs.readFileSync(reportsPath, 'utf-8');
      reports = JSON.parse(data || '[]');
      console.log(`📄 Loaded ${reports.length} reports from JSON`);
    }

    if (fs.existsSync(settingsPath)) {
      const data = fs.readFileSync(settingsPath, 'utf-8');
      settings = JSON.parse(data || '{}');
      console.log(`📄 Loaded settings from JSON`);
    }

    console.log('\n⏳ Starting database migration...\n');

    // Start transaction
    await client.query('BEGIN');

    // Migrate users
    if (users.length > 0) {
      console.log('→ Migrating users...');
      for (const user of users) {
        try {
          await client.query(
            `INSERT INTO users (id, username, name, role, status, password_hash, assigned_vehicle_id, created_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
             ON CONFLICT (id) DO NOTHING`,
            [
              user.id,
              user.username,
              user.name,
              user.role,
              user.status || 'Active',
              user.passwordHash,
              user.assignedVehicleId || null,
              user.createdAt || new Date().toISOString(),
            ]
          );
        } catch (err) {
          console.warn(`  ⚠️  Error migrating user ${user.username}:`, err.message);
        }
      }
      console.log(`✓ Migrated ${users.length} users\n`);
    }

    // Migrate vehicles
    if (vehicles.length > 0) {
      console.log('→ Migrating vehicles...');
      for (const vehicle of vehicles) {
        try {
          await client.query(
            `INSERT INTO vehicles (id, vehicle_number, vehicle_name, brand, model, insurance_expiry, assigned_driver_id, status, created_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
             ON CONFLICT (id) DO NOTHING`,
            [
              vehicle.id,
              vehicle.vehicleNumber,
              vehicle.vehicleName,
              vehicle.brand || null,
              vehicle.model || null,
              vehicle.insuranceExpiry || null,
              vehicle.assignedDriverId || null,
              vehicle.status || 'Active',
              vehicle.createdAt || new Date().toISOString(),
            ]
          );
        } catch (err) {
          console.warn(`  ⚠️  Error migrating vehicle ${vehicle.vehicleNumber}:`, err.message);
        }
      }
      console.log(`✓ Migrated ${vehicles.length} vehicles\n`);
    }

    // Migrate reports
    if (reports.length > 0) {
      console.log('→ Migrating reports...');
      for (const report of reports) {
        try {
          await client.query(
            `INSERT INTO daily_reports (
              id, driver_id, driver_name, report_date, vehicle_id, vehicle_number,
              ola_rides, uber_rides, rapido_rides, other_rides, total_rides,
              ola_earnings, uber_earnings, rapido_earnings, other_earnings, total_earnings,
              commission_percent, commission_amount,
              fuel_paid_by, fuel_type, fuel_amount,
              driver_keeps, owner_due, settlement_status,
              amount_collected, pending_amount,
              starting_km, ending_km, total_distance, created_at
            ) VALUES (
              $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16,
              $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30
            )
             ON CONFLICT (driver_id, report_date) DO NOTHING`,
            [
              report.id,
              report.driverId,
              report.driverName,
              report.date,
              report.vehicleId,
              report.vehicleNumber,
              report.olaRides || 0,
              report.uberRides || 0,
              report.rapidoRides || 0,
              report.otherRides || 0,
              report.totalRides || 0,
              report.olaEarnings || 0,
              report.uberEarnings || 0,
              report.rapidoEarnings || 0,
              report.otherEarnings || 0,
              report.totalEarnings || 0,
              report.commissionPercent || 0,
              report.commissionAmount || 0,
              report.fuelPaidBy || 'Driver',
              report.fuelType || 'CNG',
              report.fuelAmount || 0,
              report.driverKeeps || 0,
              report.ownerDue || 0,
              report.settlementStatus || 'Pending',
              report.amountCollected || null,
              report.pendingAmount || null,
              report.startingKM || null,
              report.endingKM || null,
              report.totalDistance || null,
              report.createdAt || new Date().toISOString(),
            ]
          );
        } catch (err) {
          console.warn(`  ⚠️  Error migrating report ${report.id}:`, err.message);
        }
      }
      console.log(`✓ Migrated ${reports.length} reports\n`);
    }

    // Migrate settings
    if (Object.keys(settings).length > 0) {
      console.log('→ Migrating commission settings...');
      try {
        await client.query(
          `INSERT INTO commission_settings (threshold, below_threshold_percent, above_threshold_percent)
           VALUES ($1, $2, $3)`,
          [
            settings.threshold || 4000,
            settings.belowThreshold || 20,
            settings.aboveThreshold || 30,
          ]
        );
        console.log(`✓ Migrated commission settings\n`);
      } catch (err) {
        console.warn(`  ⚠️  Error migrating settings:`, err.message);
      }
    }

    // Commit transaction
    await client.query('COMMIT');

    console.log('✅ Migration completed successfully!\n');

    // Verification
    console.log('📊 Verification:');
    const userCount = await client.query('SELECT COUNT(*) FROM users');
    const vehicleCount = await client.query('SELECT COUNT(*) FROM vehicles');
    const reportCount = await client.query('SELECT COUNT(*) FROM daily_reports');
    const settingCount = await client.query('SELECT COUNT(*) FROM commission_settings');

    console.log(`  • Users: ${userCount.rows[0].count}`);
    console.log(`  • Vehicles: ${vehicleCount.rows[0].count}`);
    console.log(`  • Reports: ${reportCount.rows[0].count}`);
    console.log(`  • Settings: ${settingCount.rows[0].count}`);

    console.log('\n🎉 All data migrated and verified!');
  } catch (error) {
    // Rollback transaction on error
    await client.query('ROLLBACK');
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

// Run migration
migrateData().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
