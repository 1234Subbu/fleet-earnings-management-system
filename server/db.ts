import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';
import { User, Vehicle, DailyReport, CommissionSettings } from '../src/types';

const DATA_DIR = path.join(process.cwd(), 'data');

// Ensure database directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const USERS_PATH = path.join(DATA_DIR, 'users.json');
const VEHICLES_PATH = path.join(DATA_DIR, 'vehicles.json');
const REPORTS_PATH = path.join(DATA_DIR, 'reports.json');
const SETTINGS_PATH = path.join(DATA_DIR, 'settings.json');

// Interface extending User with a password hash for secure login
export interface DBUser extends User {
  passwordHash: string;
}

// Memory cache to avoid excessive I/O, synced to disk on every write
let cachedUsers: DBUser[] = [];
let cachedVehicles: Vehicle[] = [];
let cachedReports: DailyReport[] = [];
let cachedSettings: CommissionSettings = {
  threshold: 4000,
  belowThreshold: 20,
  aboveThreshold: 30,
};

// Help load/save functions
function loadJSON<T>(filePath: string, defaultValue: T): T {
  try {
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf-8');
      return JSON.parse(content) as T;
    }
  } catch (error) {
    console.error(`Error reading database file ${filePath}:`, error);
  }
  return defaultValue;
}

function saveJSON<T>(filePath: string, data: T): void {
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
  } catch (error) {
    console.error(`Error writing database file ${filePath}:`, error);
  }
}

// Load and seed DB if empty
export async function initializeDB() {
  cachedUsers = loadJSON<DBUser[]>(USERS_PATH, []);
  cachedVehicles = loadJSON<Vehicle[]>(VEHICLES_PATH, []);
  cachedReports = loadJSON<DailyReport[]>(REPORTS_PATH, []);
  cachedSettings = loadJSON<CommissionSettings>(SETTINGS_PATH, {
    threshold: 4000,
    belowThreshold: 20,
    aboveThreshold: 30,
  });

  let needsSave = false;

  // 1. Seed Owner and Drivers if Users is empty
  if (cachedUsers.length === 0) {
    console.log('Seeding initial system users...');
    const ownerPasswordHash = await bcrypt.hash('owner123', 10);
    const driver1PasswordHash = await bcrypt.hash('driver123', 10);
    const driver2PasswordHash = await bcrypt.hash('driver123', 10);

    cachedUsers.push({
      id: 'usr_owner_01',
      username: 'owner',
      name: 'Rajesh Kumar (Owner)',
      role: 'Owner',
      status: 'Active',
      passwordHash: ownerPasswordHash,
      createdAt: new Date().toISOString(),
    });

    cachedUsers.push({
      id: 'usr_driver_01',
      username: 'driver1',
      name: 'Ramesh Singh',
      role: 'Driver',
      status: 'Active',
      passwordHash: driver1PasswordHash,
      createdAt: new Date().toISOString(),
    });

    cachedUsers.push({
      id: 'usr_driver_02',
      username: 'driver2',
      name: 'Suresh Yadav',
      role: 'Driver',
      status: 'Active',
      passwordHash: driver2PasswordHash,
      createdAt: new Date().toISOString(),
    });

    needsSave = true;
  }

  // 2. Do not seed any vehicles automatically to keep database clean
  // 3. Do not seed any report history to keep database clean

  if (needsSave) {
    saveJSON(USERS_PATH, cachedUsers);
    saveJSON(VEHICLES_PATH, cachedVehicles);
    saveJSON(REPORTS_PATH, cachedReports);
    saveJSON(SETTINGS_PATH, cachedSettings);
    console.log('Database initialized with clean data!');
  }
}

// User CRUD operations
export const db = {
  // Users
  getUsers: () => cachedUsers.map(({ passwordHash, ...u }) => u),
  getUsersRaw: () => cachedUsers,
  getUserById: (id: string) => {
    const user = cachedUsers.find((u) => u.id === id);
    if (!user) return null;
    const { passwordHash, ...u } = user;
    return u;
  },
  getUserByUsername: (username: string) => {
    return cachedUsers.find((u) => u.username.toLowerCase() === username.toLowerCase()) || null;
  },
  createUser: (user: Omit<DBUser, 'id' | 'createdAt'>) => {
    const newUser: DBUser = {
      ...user,
      id: `usr_${Date.now()}`,
      createdAt: new Date().toISOString(),
    };
    cachedUsers.push(newUser);
    saveJSON(USERS_PATH, cachedUsers);
    const { passwordHash, ...u } = newUser;
    return u;
  },
  updateUser: (id: string, updates: Partial<Omit<DBUser, 'id' | 'passwordHash' | 'createdAt'>>) => {
    const index = cachedUsers.findIndex((u) => u.id === id);
    if (index === -1) return null;
    cachedUsers[index] = { ...cachedUsers[index], ...updates };
    saveJSON(USERS_PATH, cachedUsers);
    const { passwordHash, ...u } = cachedUsers[index];
    return u;
  },
  updateUserPassword: (id: string, passwordHash: string) => {
    const index = cachedUsers.findIndex((u) => u.id === id);
    if (index === -1) return false;
    cachedUsers[index].passwordHash = passwordHash;
    saveJSON(USERS_PATH, cachedUsers);
    return true;
  },
  deleteUser: (id: string) => {
    const index = cachedUsers.findIndex((u) => u.id === id);
    if (index === -1) return false;
    cachedUsers.splice(index, 1);
    saveJSON(USERS_PATH, cachedUsers);
    return true;
  },

  // Vehicles
  getVehicles: () => cachedVehicles,
  getVehicleById: (id: string) => cachedVehicles.find((v) => v.id === id) || null,
  createVehicle: (vehicle: Omit<Vehicle, 'id'>) => {
    const newVehicle: Vehicle = {
      ...vehicle,
      id: `veh_${Date.now()}`,
    };
    cachedVehicles.push(newVehicle);
    saveJSON(VEHICLES_PATH, cachedVehicles);
    return newVehicle;
  },
  updateVehicle: (id: string, updates: Partial<Omit<Vehicle, 'id'>>) => {
    const index = cachedVehicles.findIndex((v) => v.id === id);
    if (index === -1) return null;
    cachedVehicles[index] = { ...cachedVehicles[index], ...updates };
    saveJSON(VEHICLES_PATH, cachedVehicles);
    return cachedVehicles[index];
  },
  deleteVehicle: (id: string) => {
    const index = cachedVehicles.findIndex((v) => v.id === id);
    if (index === -1) return false;
    cachedVehicles.splice(index, 1);
    saveJSON(VEHICLES_PATH, cachedVehicles);
    return true;
  },

  // Daily Reports
  getReports: () => cachedReports,
  getReportById: (id: string) => cachedReports.find((r) => r.id === id) || null,
  getReportsByDriver: (driverId: string) => cachedReports.filter((r) => r.driverId === driverId),
  getReportByDriverAndDate: (driverId: string, date: string) => 
    cachedReports.find((r) => r.driverId === driverId && r.date === date) || null,
  createReport: (report: Omit<DailyReport, 'id' | 'createdAt'>) => {
    const newReport: DailyReport = {
      ...report,
      id: `rep_${Date.now()}`,
      createdAt: new Date().toISOString(),
    };
    cachedReports.push(newReport);
    saveJSON(REPORTS_PATH, cachedReports);
    return newReport;
  },
  updateReport: (id: string, updates: Partial<Omit<DailyReport, 'id' | 'createdAt'>>) => {
    const index = cachedReports.findIndex((r) => r.id === id);
    if (index === -1) return null;
    cachedReports[index] = { ...cachedReports[index], ...updates };
    saveJSON(REPORTS_PATH, cachedReports);
    return cachedReports[index];
  },
  deleteReport: (id: string) => {
    const index = cachedReports.findIndex((r) => r.id === id);
    if (index === -1) return false;
    cachedReports.splice(index, 1);
    saveJSON(REPORTS_PATH, cachedReports);
    return true;
  },

  // Commission Settings
  getSettings: () => cachedSettings,
  updateSettings: (updates: Partial<CommissionSettings>) => {
    cachedSettings = { ...cachedSettings, ...updates };
    saveJSON(SETTINGS_PATH, cachedSettings);
    return cachedSettings;
  },
};
