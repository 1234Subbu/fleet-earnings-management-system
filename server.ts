import express from 'express';
import path from 'path';
import fs from 'fs';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { createServer as createViteServer } from 'vite';
import { initializeDB, db, DBUser } from './server/db';
import { DailyReport, SettlementStatus, FuelPaidBy, FuelType } from './src/types';

const PORT = 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'fleet-earnings-super-secret-key-2026';

// Ensure upload directory exists
const UPLOAD_DIR = path.join(process.cwd(), 'data', 'uploads');
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

async function startServer() {
  // Initialize the persistent DB files and seed them if empty
  await initializeDB();

  const app = express();

  // Configure middleware. Accept larger payload size for image base64 uploads
  app.use(express.json({ limit: '15mb' }));
  app.use(express.urlencoded({ limit: '15mb', extended: true }));

  // Serve static uploaded files
  app.use('/data/uploads', express.static(UPLOAD_DIR));

  // --- MIDDLEWARES ---

  function authenticateToken(req: any, res: any, next: any) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ error: 'Access token required' });
    }
    
    jwt.verify(token, JWT_SECRET, (err: any, decoded: any) => {
      if (err) {
        return res.status(403).json({ error: 'Invalid or expired token' });
      }
      req.user = decoded;
      next();
    });
  }

  function requireOwner(req: any, res: any, next: any) {
    if (req.user.role !== 'Owner') {
      return res.status(403).json({ error: 'Access restricted to owner only' });
    }
    next();
  }

  // --- API ENDPOINTS ---

  // 1. Auth API
  app.post('/api/auth/login', async (req: express.Request, res: express.Response) => {
    try {
      const { username, password } = req.body;
      if (!username || !password) {
        return res.status(400).json({ error: 'Username and password are required' });
      }

      const user = db.getUserByUsername(username);
      if (!user) {
        return res.status(401).json({ error: 'Invalid username or password' });
      }

      if (user.status === 'Disabled') {
        return res.status(403).json({ error: 'Your account has been disabled. Please contact the owner.' });
      }

      const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
      if (!isPasswordValid) {
        return res.status(401).json({ error: 'Invalid username or password' });
      }

      // Generate JWT
      const token = jwt.sign(
        { id: user.id, username: user.username, role: user.role, name: user.name },
        JWT_SECRET,
        { expiresIn: '7d' }
      );

      res.json({
        token,
        user: {
          id: user.id,
          username: user.username,
          name: user.name,
          role: user.role,
          status: user.status,
          assignedVehicleId: user.assignedVehicleId,
        }
      });
    } catch (err: any) {
      res.status(500).json({ error: 'Login error: ' + err.message });
    }
  });

  app.get('/api/auth/me', authenticateToken, (req: any, res: express.Response) => {
    const user = db.getUserById(req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json({ user });
  });

  // 2. Image Upload API (Base64 proof saver)
  app.post('/api/upload', authenticateToken, (req: express.Request, res: express.Response) => {
    try {
      const { base64, filename } = req.body;
      if (!base64 || !filename) {
        return res.status(400).json({ error: 'Base64 content and filename are required' });
      }

      // Clean base64 header if present
      const cleanBase64 = base64.replace(/^data:image\/\w+;base64,/, '');
      const buffer = Buffer.from(cleanBase64, 'base64');
      
      const fileExt = path.extname(filename) || '.png';
      const uniqueName = `proof_${Date.now()}_${Math.floor(Math.random() * 1000)}${fileExt}`;
      const savePath = path.join(UPLOAD_DIR, uniqueName);

      fs.writeFileSync(savePath, buffer);

      // Return the access path
      const fileUrl = `/data/uploads/${uniqueName}`;
      res.json({ url: fileUrl });
    } catch (err: any) {
      res.status(500).json({ error: 'Upload failed: ' + err.message });
    }
  });

  // 3. Drivers API (Owner Only)
  app.get('/api/drivers', authenticateToken, requireOwner, (req: express.Request, res: express.Response) => {
    const drivers = db.getUsers().filter(u => u.role === 'Driver');
    res.json({ drivers });
  });

  app.post('/api/drivers', authenticateToken, requireOwner, async (req: express.Request, res: express.Response) => {
    try {
      const { username, password, name, assignedVehicleId } = req.body;
      if (!username || !password || !name) {
        return res.status(400).json({ error: 'Username, password, and name are required' });
      }

      // Check if username already exists
      const existing = db.getUserByUsername(username);
      if (existing) {
        return res.status(400).json({ error: 'Username is already taken' });
      }

      const passwordHash = await bcrypt.hash(password, 10);
      const newDriver = db.createUser({
        username,
        name,
        role: 'Driver',
        status: 'Active',
        assignedVehicleId,
        passwordHash
      });

      // If vehicle assigned, update vehicle record as well
      if (assignedVehicleId) {
        db.updateVehicle(assignedVehicleId, { assignedDriverId: newDriver.id });
      }

      res.status(201).json({ driver: newDriver });
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to create driver: ' + err.message });
    }
  });

  app.put('/api/drivers/:id', authenticateToken, requireOwner, (req: express.Request, res: express.Response) => {
    const { id } = req.params;
    const { name, status, assignedVehicleId } = req.body;

    const currentDriver = db.getUserById(id);
    if (!currentDriver || currentDriver.role !== 'Driver') {
      return res.status(404).json({ error: 'Driver not found' });
    }

    // Handle vehicle assignment updates
    const oldVehicleId = currentDriver.assignedVehicleId;
    if (oldVehicleId && oldVehicleId !== assignedVehicleId) {
      // Unassign old vehicle
      db.updateVehicle(oldVehicleId, { assignedDriverId: undefined });
    }

    const updated = db.updateUser(id, { name, status, assignedVehicleId });

    if (assignedVehicleId) {
      // Assign new vehicle
      db.updateVehicle(assignedVehicleId, { assignedDriverId: id });
    }

    res.json({ driver: updated });
  });

  app.put('/api/drivers/:id/reset-password', authenticateToken, requireOwner, async (req: express.Request, res: express.Response) => {
    try {
      const { id } = req.params;
      const { password } = req.body;
      if (!password) {
        return res.status(400).json({ error: 'New password is required' });
      }

      const driver = db.getUserById(id);
      if (!driver || driver.role !== 'Driver') {
        return res.status(404).json({ error: 'Driver not found' });
      }

      const hash = await bcrypt.hash(password, 10);
      db.updateUserPassword(id, hash);

      res.json({ message: 'Driver password reset successfully' });
    } catch (err: any) {
      res.status(500).json({ error: 'Password reset failed: ' + err.message });
    }
  });

  app.delete('/api/drivers/:id', authenticateToken, requireOwner, (req: express.Request, res: express.Response) => {
    const { id } = req.params;
    const driver = db.getUserById(id);
    if (!driver || driver.role !== 'Driver') {
      return res.status(404).json({ error: 'Driver not found' });
    }

    // Unassign vehicle before deletion
    if (driver.assignedVehicleId) {
      db.updateVehicle(driver.assignedVehicleId, { assignedDriverId: undefined });
    }

    db.deleteUser(id);
    res.json({ message: 'Driver deleted successfully' });
  });

  // 4. Vehicles API
  app.get('/api/vehicles', authenticateToken, (req: express.Request, res: express.Response) => {
    const vehicles = db.getVehicles();
    res.json({ vehicles });
  });

  app.post('/api/vehicles', authenticateToken, requireOwner, (req: express.Request, res: express.Response) => {
    const { vehicleNumber, vehicleName, brand, model, insuranceExpiry, assignedDriverId, status } = req.body;
    if (!vehicleNumber || !vehicleName) {
      return res.status(400).json({ error: 'Vehicle number and vehicle name are required' });
    }

    const newVehicle = db.createVehicle({
      vehicleNumber,
      vehicleName,
      brand: brand || '',
      model: model || '',
      insuranceExpiry: insuranceExpiry || '',
      assignedDriverId,
      status: status || 'Active'
    });

    if (assignedDriverId) {
      db.updateUser(assignedDriverId, { assignedVehicleId: newVehicle.id });
    }

    res.status(201).json({ vehicle: newVehicle });
  });

  app.put('/api/vehicles/:id', authenticateToken, requireOwner, (req: express.Request, res: express.Response) => {
    const { id } = req.params;
    const { vehicleNumber, vehicleName, brand, model, insuranceExpiry, assignedDriverId, status } = req.body;

    const currentVehicle = db.getVehicleById(id);
    if (!currentVehicle) {
      return res.status(404).json({ error: 'Vehicle not found' });
    }

    // Handle driver reassignments
    const oldDriverId = currentVehicle.assignedDriverId;
    if (oldDriverId && oldDriverId !== assignedDriverId) {
      db.updateUser(oldDriverId, { assignedVehicleId: undefined });
    }

    const updated = db.updateVehicle(id, {
      vehicleNumber,
      vehicleName,
      brand,
      model,
      insuranceExpiry,
      assignedDriverId,
      status
    });

    if (assignedDriverId) {
      db.updateUser(assignedDriverId, { assignedVehicleId: id });
    }

    res.json({ vehicle: updated });
  });

  app.delete('/api/vehicles/:id', authenticateToken, requireOwner, (req: express.Request, res: express.Response) => {
    const { id } = req.params;
    const vehicle = db.getVehicleById(id);
    if (!vehicle) {
      return res.status(404).json({ error: 'Vehicle not found' });
    }

    // Unassign driver from this vehicle
    if (vehicle.assignedDriverId) {
      db.updateUser(vehicle.assignedDriverId, { assignedVehicleId: undefined });
    }

    db.deleteVehicle(id);
    res.json({ message: 'Vehicle deleted successfully' });
  });

  // 5. Settings API (Commission structure rules)
  app.get('/api/settings', authenticateToken, (req: express.Request, res: express.Response) => {
    res.json({ settings: db.getSettings() });
  });

  app.put('/api/settings', authenticateToken, requireOwner, (req: express.Request, res: express.Response) => {
    const { threshold, belowThreshold, aboveThreshold } = req.body;
    if (threshold === undefined || belowThreshold === undefined || aboveThreshold === undefined) {
      return res.status(400).json({ error: 'All threshold and percentage limits are required' });
    }

    const updated = db.updateSettings({
      threshold: Number(threshold),
      belowThreshold: Number(belowThreshold),
      aboveThreshold: Number(aboveThreshold)
    });

    res.json({ settings: updated, message: 'Commission settings updated successfully' });
  });

  // 6. Reports API
  app.get('/api/reports', authenticateToken, (req: any, res: express.Response) => {
    let reports = db.getReports();

    // If driver, restrict to own reports only
    if (req.user.role === 'Driver') {
      reports = reports.filter(r => r.driverId === req.user.id);
    }

    // Apply Filters
    const { driverId, vehicleId, date, settlementStatus, fuelPaidBy, month, year } = req.query;

    if (driverId) reports = reports.filter(r => r.driverId === String(driverId));
    if (vehicleId) reports = reports.filter(r => r.vehicleId === String(vehicleId));
    if (date) reports = reports.filter(r => r.date === String(date));
    if (settlementStatus) reports = reports.filter(r => r.settlementStatus === String(settlementStatus));
    if (fuelPaidBy) reports = reports.filter(r => r.fuelPaidBy === String(fuelPaidBy));
    
    if (month && year) {
      const matchPrefix = `${year}-${String(month).padStart(2, '0')}`;
      reports = reports.filter(r => r.date.startsWith(matchPrefix));
    } else if (year) {
      reports = reports.filter(r => r.date.startsWith(String(year)));
    }

    // Sort descending by date
    reports.sort((a, b) => b.date.localeCompare(a.date));

    res.json({ reports });
  });

  app.get('/api/reports/:id', authenticateToken, (req: any, res: express.Response) => {
    const report = db.getReportById(req.params.id);
    if (!report) {
      return res.status(404).json({ error: 'Report not found' });
    }

    // Security check: Drivers can only view their own
    if (req.user.role === 'Driver' && report.driverId !== req.user.id) {
      return res.status(403).json({ error: 'Unauthorized to view this report' });
    }

    res.json({ report });
  });

  app.post('/api/reports', authenticateToken, (req: any, res: express.Response) => {
    try {
      const {
        date,
        vehicleId,
        olaRides, uberRides, rapidoRides, otherRides,
        olaEarnings, uberEarnings, rapidoEarnings, otherEarnings,
        fuelPaidBy, fuelType, fuelAmount,
        images,
        startingKM,
        endingKM
      } = req.body;

      if (!date || !vehicleId) {
        return res.status(400).json({ error: 'Date and vehicle choice are required' });
      }

      if (startingKM === undefined || endingKM === undefined) {
        return res.status(400).json({ error: 'Starting and Ending Odometer readings are required' });
      }

      const startKM = Number(startingKM);
      const endKM = Number(endingKM);

      if (isNaN(startKM) || isNaN(endKM)) {
        return res.status(400).json({ error: 'Odometer readings must be valid numbers' });
      }

      if (startKM < 0 || endKM < 0) {
        return res.status(400).json({ error: 'Odometer readings cannot be negative' });
      }

      if (endKM < startKM) {
        return res.status(400).json({ error: 'Ending Odometer reading must be greater than or equal to Starting Odometer reading' });
      }

      const totalDistance = endKM - startKM;

      const driverId = req.user.id;
      const driverName = req.user.name;

      // Prevent duplicate reports for the same date for this driver
      const existing = db.getReportByDriverAndDate(driverId, date);
      if (existing) {
        return res.status(400).json({ error: `You have already submitted a daily report for ${date}. Duplicate entries are not allowed.` });
      }

      // Fetch vehicle details
      const vehicle = db.getVehicleById(vehicleId);
      if (!vehicle) {
        return res.status(400).json({ error: 'Selected vehicle does not exist' });
      }

      // Calculate automatic fields
      const totalRides = Number(olaRides || 0) + Number(uberRides || 0) + Number(rapidoRides || 0) + Number(otherRides || 0);
      const totalEarnings = Number(olaEarnings || 0) + Number(uberEarnings || 0) + Number(rapidoEarnings || 0) + Number(otherEarnings || 0);

      // Apply commission rules
      const settings = db.getSettings();
      const commissionPercent = totalEarnings >= settings.threshold ? settings.aboveThreshold : settings.belowThreshold;
      const commissionAmount = Math.round((totalEarnings * commissionPercent) / 100);

      // Business logic cases
      const fAmount = Number(fuelAmount || 0);
      let ownerDue = 0;
      let driverKeeps = 0;

      if (fuelPaidBy === 'Driver') {
        ownerDue = totalEarnings - commissionAmount - fAmount;
        driverKeeps = commissionAmount + fAmount;
      } else {
        // Paid by Owner
        ownerDue = totalEarnings - commissionAmount;
        driverKeeps = commissionAmount;
      }

      const newReport = db.createReport({
        driverId,
        driverName,
        date,
        vehicleId,
        vehicleNumber: vehicle.vehicleNumber,
        olaRides: Number(olaRides || 0),
        uberRides: Number(uberRides || 0),
        rapidoRides: Number(rapidoRides || 0),
        otherRides: Number(otherRides || 0),
        totalRides,
        olaEarnings: Number(olaEarnings || 0),
        uberEarnings: Number(uberEarnings || 0),
        rapidoEarnings: Number(rapidoEarnings || 0),
        otherEarnings: Number(otherEarnings || 0),
        totalEarnings,
        commissionPercent,
        commissionAmount,
        fuelPaidBy: fuelPaidBy as FuelPaidBy,
        fuelType: fuelType as FuelType,
        fuelAmount: fAmount,
        driverKeeps,
        ownerDue,
        settlementStatus: 'Pending',
        amountCollected: 0,
        pendingAmount: ownerDue,
        settlementHistory: [],
        images: images || [],
        startingKM: startKM,
        endingKM: endKM,
        totalDistance: totalDistance
      });

      res.status(201).json({ report: newReport, message: "Today's report has been submitted successfully." });
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to submit report: ' + err.message });
    }
  });

  // Owner records a settlement payment on a report
  app.post('/api/reports/:id/payments', authenticateToken, requireOwner, (req: any, res: express.Response) => {
    const { id } = req.params;
    const { amount, date, method, notes } = req.body;

    const report = db.getReportById(id);
    if (!report) {
      return res.status(404).json({ error: 'Report not found' });
    }

    const payAmount = Number(amount);
    if (isNaN(payAmount) || payAmount <= 0) {
      return res.status(400).json({ error: 'Payment amount must be a positive number' });
    }

    const currentCollected = report.amountCollected !== undefined ? report.amountCollected : (report.settlementStatus === 'Paid' ? report.ownerDue : 0);
    const currentPending = report.pendingAmount !== undefined ? report.pendingAmount : (report.settlementStatus === 'Paid' ? 0 : report.ownerDue);

    if (currentCollected + payAmount > report.ownerDue) {
      return res.status(400).json({ error: `Payment amount ₹${payAmount} exceeds the remaining pending amount ₹${currentPending}` });
    }

    const newCollected = currentCollected + payAmount;
    const newPending = Math.max(0, report.ownerDue - newCollected);
    const newStatus: SettlementStatus = newPending === 0 ? 'Paid' : 'Pending';

    const newPayment = {
      id: `pay_${Date.now()}`,
      amount: payAmount,
      date: date || new Date().toISOString().split('T')[0],
      method: method || 'Cash',
      notes: notes || ''
    };

    const updatedHistory = [...(report.settlementHistory || []), newPayment];

    const updated = db.updateReport(id, {
      amountCollected: newCollected,
      pendingAmount: newPending,
      settlementStatus: newStatus,
      settlementHistory: updatedHistory
    });

    res.json({ report: updated, message: 'Settlement payment recorded successfully.' });
  });

  // Owner changes report settlement status directly (e.g. manually toggle Paid/Pending)
  app.put('/api/reports/:id/settle', authenticateToken, requireOwner, (req: express.Request, res: express.Response) => {
    const { id } = req.params;
    const { settlementStatus } = req.body;

    if (!settlementStatus || !['Pending', 'Paid'].includes(settlementStatus)) {
      return res.status(400).json({ error: 'Invalid settlement status' });
    }

    const report = db.getReportById(id);
    if (!report) {
      return res.status(404).json({ error: 'Report not found' });
    }

    let amountCollected = report.amountCollected || 0;
    let pendingAmount = report.pendingAmount !== undefined ? report.pendingAmount : report.ownerDue;
    let settlementHistory = report.settlementHistory || [];

    if (settlementStatus === 'Paid') {
      const remaining = report.ownerDue - amountCollected;
      if (remaining > 0) {
        amountCollected = report.ownerDue;
        pendingAmount = 0;
        settlementHistory = [
          ...settlementHistory,
          {
            id: `pay_auto_${Date.now()}`,
            amount: remaining,
            date: new Date().toISOString().split('T')[0],
            method: 'Cash',
            notes: 'Manually marked as Paid'
          }
        ];
      }
    } else {
      // Marked back to Pending
      amountCollected = 0;
      pendingAmount = report.ownerDue;
      settlementHistory = [];
    }

    const updated = db.updateReport(id, {
      settlementStatus: settlementStatus as SettlementStatus,
      amountCollected,
      pendingAmount,
      settlementHistory
    });

    res.json({ report: updated, message: `Report settlement status updated to ${settlementStatus}.` });
  });

  // 7. Stats API
  app.get('/api/stats/dashboard', authenticateToken, (req: any, res: express.Response) => {
    const reports = db.getReports();
    const drivers = db.getUsers().filter(u => u.role === 'Driver');

    const parseLocalDate = (dateStr: string) => {
      const [y, m, d] = dateStr.split('-').map(Number);
      return new Date(y, m - 1, d);
    };

    const todayStr = new Date().toISOString().split('T')[0];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const startOfWeek = new Date(today);
    const day = today.getDay();
    const diff = today.getDate() - day + (day === 0 ? -6 : 1); // Monday
    startOfWeek.setDate(diff);
    startOfWeek.setHours(0, 0, 0, 0);

    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

    if (req.user.role === 'Owner') {
      const todayReports = reports.filter(r => r.date === todayStr);
      const weeklyReports = reports.filter(r => {
        const rDate = parseLocalDate(r.date);
        return rDate >= startOfWeek && rDate <= today;
      });
      const monthlyReports = reports.filter(r => {
        const rDate = parseLocalDate(r.date);
        return rDate >= startOfMonth && rDate <= today;
      });

      const computeSummary = (subset: any[]) => {
        const uniqueDrivers = new Set(subset.map(r => r.driverId)).size;
        const rides = subset.reduce((sum, r) => sum + (r.totalRides || 0), 0);
        const earnings = subset.reduce((sum, r) => sum + (r.totalEarnings || 0), 0);
        const commission = subset.reduce((sum, r) => sum + (r.commissionAmount || 0), 0);
        const fuelExpense = subset.reduce((sum, r) => sum + (r.fuelAmount || 0), 0);
        const ownerReceivable = subset.reduce((sum, r) => sum + (r.ownerDue || 0), 0);
        const amountCollected = subset.reduce((sum, r) => {
          const coll = r.amountCollected !== undefined ? r.amountCollected : (r.settlementStatus === 'Paid' ? r.ownerDue : 0);
          return sum + coll;
        }, 0);
        const pendingCollection = subset.reduce((sum, r) => {
          const pend = r.pendingAmount !== undefined ? r.pendingAmount : (r.settlementStatus === 'Paid' ? 0 : r.ownerDue);
          return sum + pend;
        }, 0);
        const kilometers = subset.reduce((sum, r) => sum + (r.totalDistance || 0), 0);

        return {
          driversWorked: uniqueDrivers,
          rides,
          earnings,
          commission,
          fuelExpense,
          ownerReceivable,
          amountCollected,
          pendingCollection,
          kilometers
        };
      };

      res.json({
        totalDrivers: drivers.length,
        todaySummary: computeSummary(todayReports),
        weeklySummary: computeSummary(weeklyReports),
        monthlySummary: computeSummary(monthlyReports),
        overallSummary: computeSummary(reports),
        pendingSettlementsCount: reports.filter(r => {
          const pend = r.pendingAmount !== undefined ? r.pendingAmount : (r.settlementStatus === 'Paid' ? 0 : r.ownerDue);
          return pend > 0;
        }).length,
        completedSettlementsCount: reports.filter(r => {
          const pend = r.pendingAmount !== undefined ? r.pendingAmount : (r.settlementStatus === 'Paid' ? 0 : r.ownerDue);
          return pend === 0;
        }).length
      });
    } else {
      // Driver Dashboard Stats (Specific to currently logged-in driver)
      const driverReports = reports.filter(r => r.driverId === req.user.id);
      
      const parseLocalDate = (dateStr: string) => {
        const [y, m, d] = dateStr.split('-').map(Number);
        return new Date(y, m - 1, d);
      };

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const todayStr = new Date().toISOString().split('T')[0];
      const todayReport = driverReports.find(r => r.date === todayStr);

      const startOfWeek = new Date(today);
      const day = today.getDay();
      const diff = today.getDate() - day + (day === 0 ? -6 : 1); // Monday
      startOfWeek.setDate(diff);
      startOfWeek.setHours(0, 0, 0, 0);

      const weeklyReports = driverReports.filter(r => {
        const rDate = parseLocalDate(r.date);
        return rDate >= startOfWeek && rDate <= today;
      });

      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      const monthlyReports = driverReports.filter(r => {
        const rDate = parseLocalDate(r.date);
        return rDate >= startOfMonth && rDate <= today;
      });

      const pendingSettlementsCount = driverReports.filter(r => r.settlementStatus === 'Pending').length;

      res.json({
        hasTodayReport: !!todayReport,
        todayReport: todayReport || null,
        pendingSettlementsCount,
        weeklySummary: {
          rides: weeklyReports.reduce((sum, r) => sum + r.totalRides, 0),
          earnings: weeklyReports.reduce((sum, r) => sum + r.totalEarnings, 0),
          commission: weeklyReports.reduce((sum, r) => sum + r.commissionAmount, 0),
          fuelExpense: weeklyReports.reduce((sum, r) => sum + r.fuelAmount, 0),
          ownerDue: weeklyReports.reduce((sum, r) => sum + r.ownerDue, 0),
          kilometers: weeklyReports.reduce((sum, r) => sum + (r.totalDistance || 0), 0)
        },
        monthlySummary: {
          rides: monthlyReports.reduce((sum, r) => sum + r.totalRides, 0),
          earnings: monthlyReports.reduce((sum, r) => sum + r.totalEarnings, 0),
          commission: monthlyReports.reduce((sum, r) => sum + r.commissionAmount, 0),
          fuelExpense: monthlyReports.reduce((sum, r) => sum + r.fuelAmount, 0),
          ownerDue: monthlyReports.reduce((sum, r) => sum + r.ownerDue, 0),
          kilometers: monthlyReports.reduce((sum, r) => sum + (r.totalDistance || 0), 0)
        }
      });
    }
  });

  // --- VITE / STATIC ROUTING ---

  try {
    if (process.env.NODE_ENV !== 'production') {
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: 'spa',
      });
      app.use(vite.middlewares);
      
      // SPA fallback route for development
      app.get('*', (req, res, next) => {
        // Skip API routes
        if (!req.path.startsWith('/api')) {
          vite.middlewares.handle(req, res, next);
        } else {
          next();
        }
      });
      
      console.log('Vite dev server middleware loaded');
    } else {
      const distPath = path.join(process.cwd(), 'dist');
      app.use(express.static(distPath));
      app.get('*', (req, res) => {
        res.sendFile(path.join(distPath, 'index.html'));
      });
    }
  } catch (error) {
    console.error('Error setting up Vite middleware:', error);
    // Fallback: serve from dist if Vite fails
    const distPath = path.join(process.cwd(), 'dist');
    if (fs.existsSync(distPath)) {
      app.use(express.static(distPath));
      app.get('*', (req, res) => {
        res.sendFile(path.join(distPath, 'index.html'));
      });
    } else {
      console.warn('Warning: dist directory not found and Vite setup failed');
    }
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Express custom server running on http://0.0.0.0:${PORT}`);
    console.log(`Visit http://localhost:${PORT} in your browser`);
  });
}

startServer().catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});
