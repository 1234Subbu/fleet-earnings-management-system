import pkg from 'pg';
import bcrypt from 'bcryptjs';
import { User, Vehicle, DailyReport, CommissionSettings } from '../src/types';

const { Pool } = pkg;

// Initialize connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
  process.exit(-1);
});

export interface DBUser extends User {
  passwordHash: string;
}

// Initialize database with seed data
export async function initializeDB() {
  try {
    const client = await pool.connect();
    try {
      // Check if users table exists
      const result = await client.query(
        `SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'users')`
      );

      if (!result.rows[0].exists) {
        // Run schema initialization
        const schema = await import('fs').then((fs) =>
          fs.readFileSync(new URL('./schema.sql', import.meta.url), 'utf-8')
        );
        await client.query(schema);
        console.log('Database schema created successfully');

        // Seed initial data
        await seedInitialData(client);
      }
    } finally {
      client.release();
    }
    console.log('Database initialized successfully');
  } catch (error) {
    console.error('Failed to initialize database:', error);
    throw error;
  }
}

async function seedInitialData(client: any) {
  try {
    // Check if owner already exists
    const userCheck = await client.query('SELECT COUNT(*) FROM users');
    if (parseInt(userCheck.rows[0].count) > 0) {
      console.log('Database already seeded');
      return;
    }

    const ownerPasswordHash = await bcrypt.hash('owner123', 10);
    const driverPasswordHash = await bcrypt.hash('driver123', 10);

    // Insert default users
    await client.query(
      `INSERT INTO users (username, name, role, status, password_hash) VALUES
       ($1, $2, $3, $4, $5),
       ($6, $7, $8, $9, $10),
       ($11, $12, $13, $14, $15)`,
      [
        'owner',
        'Rajesh Kumar (Owner)',
        'Owner',
        'Active',
        ownerPasswordHash,
        'driver1',
        'Ramesh Singh',
        'Driver',
        'Active',
        driverPasswordHash,
        'driver2',
        'Suresh Yadav',
        'Driver',
        'Active',
        driverPasswordHash,
      ]
    );

    // Insert default commission settings
    await client.query(
      `INSERT INTO commission_settings (threshold, below_threshold_percent, above_threshold_percent)
       VALUES ($1, $2, $3)`,
      [4000, 20, 30]
    );

    console.log('Initial data seeded successfully');
  } catch (error) {
    console.error('Error seeding data:', error);
    throw error;
  }
}

// ===== User Operations =====
export async function getUser(userId: string): Promise<DBUser | null> {
  try {
    const result = await pool.query(
      `SELECT id, username, name, role, status, password_hash as "passwordHash", assigned_vehicle_id as "assignedVehicleId", created_at as "createdAt"
       FROM users WHERE id = $1`,
      [userId]
    );
    return result.rows[0] || null;
  } catch (error) {
    console.error('Error getting user:', error);
    throw error;
  }
}

export async function getUserByUsername(username: string): Promise<DBUser | null> {
  try {
    const result = await pool.query(
      `SELECT id, username, name, role, status, password_hash as "passwordHash", assigned_vehicle_id as "assignedVehicleId", created_at as "createdAt"
       FROM users WHERE username = $1`,
      [username]
    );
    return result.rows[0] || null;
  } catch (error) {
    console.error('Error getting user by username:', error);
    throw error;
  }
}

export async function getAllUsers(): Promise<User[]> {
  try {
    const result = await pool.query(
      `SELECT id, username, name, role, status, assigned_vehicle_id as "assignedVehicleId", created_at as "createdAt"
       FROM users ORDER BY created_at DESC`
    );
    return result.rows;
  } catch (error) {
    console.error('Error getting all users:', error);
    throw error;
  }
}

export async function createUser(user: { username: string; name: string; role: 'Owner' | 'Driver'; password: string }): Promise<User> {
  try {
    const passwordHash = await bcrypt.hash(user.password, 10);
    const result = await pool.query(
      `INSERT INTO users (username, name, role, status, password_hash)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, username, name, role, status, assigned_vehicle_id as "assignedVehicleId", created_at as "createdAt"`,
      [user.username, user.name, user.role, 'Active', passwordHash]
    );
    return result.rows[0];
  } catch (error) {
    console.error('Error creating user:', error);
    throw error;
  }
}

// ===== Vehicle Operations =====
export async function getAllVehicles(): Promise<Vehicle[]> {
  try {
    const result = await pool.query(
      `SELECT id, vehicle_number as "vehicleNumber", vehicle_name as "vehicleName", 
              brand, model, insurance_expiry as "insuranceExpiry",
              assigned_driver_id as "assignedDriverId", status
       FROM vehicles ORDER BY created_at DESC`
    );
    return result.rows;
  } catch (error) {
    console.error('Error getting vehicles:', error);
    throw error;
  }
}

export async function getVehicle(vehicleId: string): Promise<Vehicle | null> {
  try {
    const result = await pool.query(
      `SELECT id, vehicle_number as "vehicleNumber", vehicle_name as "vehicleName",
              brand, model, insurance_expiry as "insuranceExpiry",
              assigned_driver_id as "assignedDriverId", status
       FROM vehicles WHERE id = $1`,
      [vehicleId]
    );
    return result.rows[0] || null;
  } catch (error) {
    console.error('Error getting vehicle:', error);
    throw error;
  }
}

export async function createVehicle(vehicle: Omit<Vehicle, 'id'>): Promise<Vehicle> {
  try {
    const result = await pool.query(
      `INSERT INTO vehicles (vehicle_number, vehicle_name, brand, model, insurance_expiry, assigned_driver_id, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, vehicle_number as "vehicleNumber", vehicle_name as "vehicleName",
                 brand, model, insurance_expiry as "insuranceExpiry",
                 assigned_driver_id as "assignedDriverId", status`,
      [
        vehicle.vehicleNumber,
        vehicle.vehicleName,
        vehicle.brand || null,
        vehicle.model || null,
        vehicle.insuranceExpiry || null,
        vehicle.assignedDriverId || null,
        vehicle.status || 'Active',
      ]
    );
    return result.rows[0];
  } catch (error) {
    console.error('Error creating vehicle:', error);
    throw error;
  }
}

export async function updateVehicle(vehicleId: string, updates: Partial<Vehicle>): Promise<Vehicle> {
  try {
    const fields: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    for (const [key, value] of Object.entries(updates)) {
      const dbKey = key
        .replace(/([A-Z])/g, '_$1')
        .toLowerCase()
        .replace(/^_/, '');
      fields.push(`${dbKey} = $${paramCount}`);
      values.push(value);
      paramCount++;
    }

    values.push(vehicleId);

    const result = await pool.query(
      `UPDATE vehicles SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP
       WHERE id = $${paramCount}
       RETURNING id, vehicle_number as "vehicleNumber", vehicle_name as "vehicleName",
                 brand, model, insurance_expiry as "insuranceExpiry",
                 assigned_driver_id as "assignedDriverId", status`,
      values
    );
    return result.rows[0];
  } catch (error) {
    console.error('Error updating vehicle:', error);
    throw error;
  }
}

// ===== Report Operations =====
export async function getAllReports(): Promise<DailyReport[]> {
  try {
    const result = await pool.query(
      `SELECT 
        id, driver_id as "driverId", driver_name as "driverName", report_date as "date",
        vehicle_id as "vehicleId", vehicle_number as "vehicleNumber",
        ola_rides as "olaRides", uber_rides as "uberRides", rapido_rides as "rapidoRides", other_rides as "otherRides", total_rides as "totalRides",
        ola_earnings as "olaEarnings", uber_earnings as "uberEarnings", rapido_earnings as "rapidoEarnings", other_earnings as "otherEarnings", total_earnings as "totalEarnings",
        commission_percent as "commissionPercent", commission_amount as "commissionAmount",
        fuel_paid_by as "fuelPaidBy", fuel_type as "fuelType", fuel_amount as "fuelAmount",
        driver_keeps as "driverKeeps", owner_due as "ownerDue", settlement_status as "settlementStatus",
        amount_collected as "amountCollected", pending_amount as "pendingAmount",
        starting_km as "startingKM", ending_km as "endingKM", total_distance as "totalDistance",
        created_at as "createdAt"
       FROM daily_reports ORDER BY report_date DESC`
    );
    return result.rows;
  } catch (error) {
    console.error('Error getting reports:', error);
    throw error;
  }
}

export async function createReport(report: DailyReport): Promise<DailyReport> {
  try {
    const result = await pool.query(
      `INSERT INTO daily_reports (
        driver_id, driver_name, report_date, vehicle_id, vehicle_number,
        ola_rides, uber_rides, rapido_rides, other_rides, total_rides,
        ola_earnings, uber_earnings, rapido_earnings, other_earnings, total_earnings,
        commission_percent, commission_amount,
        fuel_paid_by, fuel_type, fuel_amount,
        driver_keeps, owner_due, settlement_status,
        amount_collected, pending_amount,
        starting_km, ending_km, total_distance
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
        $11, $12, $13, $14, $15, $16, $17, $18, $19, $20,
        $21, $22, $23, $24, $25, $26, $27, $28
      )
      RETURNING 
        id, driver_id as "driverId", driver_name as "driverName", report_date as "date",
        vehicle_id as "vehicleId", vehicle_number as "vehicleNumber",
        ola_rides as "olaRides", uber_rides as "uberRides", rapido_rides as "rapidoRides", other_rides as "otherRides", total_rides as "totalRides",
        ola_earnings as "olaEarnings", uber_earnings as "uberEarnings", rapido_earnings as "rapidoEarnings", other_earnings as "otherEarnings", total_earnings as "totalEarnings",
        commission_percent as "commissionPercent", commission_amount as "commissionAmount",
        fuel_paid_by as "fuelPaidBy", fuel_type as "fuelType", fuel_amount as "fuelAmount",
        driver_keeps as "driverKeeps", owner_due as "ownerDue", settlement_status as "settlementStatus",
        amount_collected as "amountCollected", pending_amount as "pendingAmount",
        starting_km as "startingKM", ending_km as "endingKM", total_distance as "totalDistance",
        created_at as "createdAt"`,
      [
        report.driverId,
        report.driverName,
        report.date,
        report.vehicleId,
        report.vehicleNumber,
        report.olaRides,
        report.uberRides,
        report.rapidoRides,
        report.otherRides,
        report.totalRides,
        report.olaEarnings,
        report.uberEarnings,
        report.rapidoEarnings,
        report.otherEarnings,
        report.totalEarnings,
        report.commissionPercent,
        report.commissionAmount,
        report.fuelPaidBy,
        report.fuelType,
        report.fuelAmount,
        report.driverKeeps,
        report.ownerDue,
        report.settlementStatus,
        report.amountCollected || null,
        report.pendingAmount || null,
        report.startingKM || null,
        report.endingKM || null,
        report.totalDistance || null,
      ]
    );
    return result.rows[0];
  } catch (error) {
    console.error('Error creating report:', error);
    throw error;
  }
}

// ===== Commission Settings =====
export async function getCommissionSettings(): Promise<CommissionSettings> {
  try {
    const result = await pool.query(
      `SELECT threshold, below_threshold_percent as "belowThreshold", above_threshold_percent as "aboveThreshold"
       FROM commission_settings ORDER BY created_at DESC LIMIT 1`
    );
    return result.rows[0] || { threshold: 4000, belowThreshold: 20, aboveThreshold: 30 };
  } catch (error) {
    console.error('Error getting commission settings:', error);
    throw error;
  }
}

export async function updateCommissionSettings(settings: CommissionSettings): Promise<CommissionSettings> {
  try {
    const result = await pool.query(
      `INSERT INTO commission_settings (threshold, below_threshold_percent, above_threshold_percent)
       VALUES ($1, $2, $3)
       RETURNING threshold, below_threshold_percent as "belowThreshold", above_threshold_percent as "aboveThreshold"`,
      [settings.threshold, settings.belowThreshold, settings.aboveThreshold]
    );
    return result.rows[0];
  } catch (error) {
    console.error('Error updating commission settings:', error);
    throw error;
  }
}

// Graceful shutdown
export async function closeDatabase() {
  await pool.end();
}
