import 'dotenv/config';
import express, { Express, Request, Response, NextFunction } from 'express';
import path from 'path';
import fs from 'fs';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { createServer as createViteServer } from 'vite';
import * as db from './server/db-postgres';
import { 
  validateUsername, 
  validatePassword, 
  sanitizeInput, 
  asyncHandler, 
  corsOptions, 
  AppError,
  createAuditLog 
} from './server/security';
import { DailyReport } from './src/types';

// Environment variables
const NODE_ENV = process.env.NODE_ENV || 'development';
const PORT = parseInt(process.env.PORT || '3000', 10);
const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRY = process.env.JWT_EXPIRY || '7d';

// Validate required environment variables
if (!JWT_SECRET) {
  console.error('ERROR: JWT_SECRET environment variable is not set!');
  process.exit(1);
}

if (!process.env.DATABASE_URL) {
  console.error('ERROR: DATABASE_URL environment variable is not set!');
  process.exit(1);
}

// Ensure upload directory exists
const UPLOAD_DIR = path.join(process.cwd(), 'data', 'uploads');
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

// Rate limiting middleware
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10),
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10),
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 login attempts per 15 minutes
  message: 'Too many login attempts, please try again later.',
  skipSuccessfulRequests: true,
});

// Type definitions
interface AuthRequest extends Request {
  user?: {
    id: string;
    username: string;
    role: 'Owner' | 'Driver';
    name: string;
  };
}

// ===== ERROR HANDLING =====
const globalErrorHandler = (
  err: Error | AppError,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      status: 'fail',
      message: err.message,
    });
  }

  console.error('Unhandled Error:', err);
  res.status(500).json({
    status: 'error',
    message: 'Internal server error',
  });
};

// ===== MIDDLEWARE =====
const authenticateToken = asyncHandler((req: AuthRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    throw new AppError('Access token required', 401);
  }

  jwt.verify(token, JWT_SECRET!, (err: any, decoded: any) => {
    if (err) {
      throw new AppError('Invalid or expired token', 403);
    }
    req.user = decoded;
    next();
  });
});

const requireOwner = (req: AuthRequest, res: Response, next: NextFunction) => {
  if (req.user?.role !== 'Owner') {
    throw new AppError('Access restricted to owner only', 403);
  }
  next();
};

async function startServer() {
  try {
    // Initialize the database
    await db.initializeDB();
    console.log('✓ Database initialized successfully');

    const app: Express = express();

    // ===== SECURITY MIDDLEWARE =====
    app.use(helmet()); // Set security HTTP headers
    app.use(cors(corsOptions)); // Enable CORS with validation
    app.use(limiter); // Global rate limiting

    // ===== BODY PARSER MIDDLEWARE =====
    app.use(express.json({ limit: '15mb' }));
    app.use(express.urlencoded({ limit: '15mb', extended: true }));

    // ===== STATIC FILES =====
    app.use('/data/uploads', express.static(UPLOAD_DIR));

    // ===== VITE DEV SERVER (Development Only) =====
    let vite: any;
    if (NODE_ENV !== 'production') {
      vite = await createViteServer({
        server: { middlewareMode: true },
        appType: 'spa',
      });
      app.use(vite.middlewares);
    }

    // ===== API ROUTES =====

    // Health check
    app.get('/api/health', (req: Request, res: Response) => {
      res.json({ status: 'ok', timestamp: new Date().toISOString() });
    });

    // ===== AUTHENTICATION API =====
    app.post('/api/auth/login', authLimiter, asyncHandler(async (req: Request, res: Response) => {
      const { username, password } = req.body;

      if (!username || !password) {
        throw new AppError('Username and password are required', 400);
      }

      const sanitizedUsername = sanitizeInput(username);
      const user = await db.getUserByUsername(sanitizedUsername);

      if (!user) {
        throw new AppError('Invalid username or password', 401);
      }

      if (user.status === 'Disabled') {
        throw new AppError('Your account has been disabled. Please contact the owner.', 403);
      }

      const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
      if (!isPasswordValid) {
        throw new AppError('Invalid username or password', 401);
      }

      // Generate JWT
      const token = jwt.sign(
        {
          id: user.id,
          username: user.username,
          role: user.role,
          name: user.name,
        },
        JWT_SECRET!,
        { expiresIn: JWT_EXPIRY }
      );

      res.json({
        status: 'success',
        data: {
          token,
          user: {
            id: user.id,
            username: user.username,
            name: user.name,
            role: user.role,
            status: user.status,
            assignedVehicleId: user.assignedVehicleId,
          },
        },
      });
    }));

    app.get('/api/auth/me', authenticateToken, asyncHandler(async (req: AuthRequest, res: Response) => {
      const user = await db.getUser(req.user!.id);
      if (!user) {
        throw new AppError('User not found', 404);
      }

      res.json({
        status: 'success',
        data: { user: { ...user, passwordHash: undefined } },
      });
    }));

    // ===== FILE UPLOAD API =====
    app.post('/api/upload', authenticateToken, asyncHandler(async (req: Request, res: Response) => {
      const { base64, filename } = req.body;

      if (!base64 || !filename) {
        throw new AppError('Base64 content and filename are required', 400);
      }

      // Validate file size
      const maxFileSize = (parseInt(process.env.MAX_FILE_SIZE_MB || '5', 10) * 1024 * 1024);
      if (base64.length > maxFileSize) {
        throw new AppError(`File size exceeds ${process.env.MAX_FILE_SIZE_MB}MB limit`, 400);
      }

      // Validate file extension
      const allowedTypes = process.env.ALLOWED_FILE_TYPES?.split(',') || ['jpg', 'jpeg', 'png', 'pdf'];
      const fileExt = path.extname(filename).toLowerCase().replace('.', '');
      if (!allowedTypes.includes(fileExt)) {
        throw new AppError(`File type .${fileExt} is not allowed`, 400);
      }

      try {
        const cleanBase64 = base64.replace(/^data:image\/\w+;base64,/, '');
        const buffer = Buffer.from(cleanBase64, 'base64');

        const uniqueName = `proof_${Date.now()}_${Math.floor(Math.random() * 10000)}.${fileExt}`;
        const savePath = path.join(UPLOAD_DIR, uniqueName);

        fs.writeFileSync(savePath, buffer);

        res.json({
          status: 'success',
          data: { url: `/data/uploads/${uniqueName}` },
        });
      } catch (err) {
        throw new AppError('File upload failed', 500);
      }
    }));

    // ===== DRIVERS API =====
    app.get(
      '/api/drivers',
      authenticateToken,
      requireOwner,
      asyncHandler(async (req: AuthRequest, res: Response) => {
        const users = await db.getAllUsers();
        const drivers = users.filter(u => u.role === 'Driver');
        res.json({ status: 'success', data: { drivers } });
      })
    );

    app.post(
      '/api/drivers',
      authenticateToken,
      requireOwner,
      asyncHandler(async (req: AuthRequest, res: Response) => {
        const { username, password, name } = req.body;

        if (!username || !password || !name) {
          throw new AppError('Username, password, and name are required', 400);
        }

        if (!validateUsername(username)) {
          throw new AppError('Username must be 3-50 characters, alphanumeric only', 400);
        }

        if (!validatePassword(password)) {
          throw new AppError(
            'Password must be at least 8 characters with uppercase, lowercase, number, and special character',
            400
          );
        }

        const sanitizedUsername = sanitizeInput(username);
        const sanitizedName = sanitizeInput(name);

        const newDriver = await db.createUser({
          username: sanitizedUsername,
          name: sanitizedName,
          role: 'Driver',
          password,
        });

        res.status(201).json({
          status: 'success',
          data: { driver: { ...newDriver, passwordHash: undefined } },
        });
      })
    );

    // ===== VEHICLES API =====
    app.get(
      '/api/vehicles',
      authenticateToken,
      asyncHandler(async (req: AuthRequest, res: Response) => {
        const vehicles = await db.getAllVehicles();
        res.json({ status: 'success', data: { vehicles } });
      })
    );

    app.post(
      '/api/vehicles',
      authenticateToken,
      requireOwner,
      asyncHandler(async (req: AuthRequest, res: Response) => {
        const { vehicleNumber, vehicleName, brand, model, insuranceExpiry } = req.body;

        if (!vehicleNumber || !vehicleName) {
          throw new AppError('Vehicle number and name are required', 400);
        }

        const vehicle = await db.createVehicle({
          id: '',
          vehicleNumber: sanitizeInput(vehicleNumber),
          vehicleName: sanitizeInput(vehicleName),
          brand: sanitizeInput(brand || ''),
          model: sanitizeInput(model || ''),
          insuranceExpiry,
          status: 'Active',
        });

        res.status(201).json({ status: 'success', data: { vehicle } });
      })
    );

    // ===== REPORTS API =====
    app.get(
      '/api/reports',
      authenticateToken,
      asyncHandler(async (req: AuthRequest, res: Response) => {
        const reports = await db.getAllReports();

        // Filter reports based on role
        const filteredReports =
          req.user?.role === 'Owner'
            ? reports
            : reports.filter(r => r.driverId === req.user?.id);

        res.json({ status: 'success', data: { reports: filteredReports } });
      })
    );

    app.post(
      '/api/reports',
      authenticateToken,
      asyncHandler(async (req: AuthRequest, res: Response) => {
        const report = req.body as DailyReport;

        if (!report.driverId || !report.date || !report.vehicleId) {
          throw new AppError('Driver ID, date, and vehicle ID are required', 400);
        }

        // Validate numeric inputs
        if (report.totalEarnings < 0 || report.commissionAmount < 0) {
          throw new AppError('Earnings and commission must be non-negative', 400);
        }

        const newReport = await db.createReport(report);
        res.status(201).json({ status: 'success', data: { report: newReport } });
      })
    );

    // ===== COMMISSION SETTINGS API =====
    app.get(
      '/api/commission-settings',
      authenticateToken,
      asyncHandler(async (req: AuthRequest, res: Response) => {
        const settings = await db.getCommissionSettings();
        res.json({ status: 'success', data: { settings } });
      })
    );

    app.put(
      '/api/commission-settings',
      authenticateToken,
      requireOwner,
      asyncHandler(async (req: AuthRequest, res: Response) => {
        const { threshold, belowThreshold, aboveThreshold } = req.body;

        if (threshold < 0 || belowThreshold < 0 || aboveThreshold < 0) {
          throw new AppError('Values must be non-negative', 400);
        }

        const settings = await db.updateCommissionSettings({
          threshold,
          belowThreshold,
          aboveThreshold,
        });

        res.json({ status: 'success', data: { settings } });
      })
    );

    // ===== SPA FALLBACK =====
    if (NODE_ENV === 'production') {
      const distPath = path.join(process.cwd(), 'dist');
      app.use(express.static(distPath));
      app.get('*', (req, res) => {
        res.sendFile(path.join(distPath, 'index.html'));
      });
    } else {
      // Fallback for dev
      app.get('*', (req, res) => {
        res.status(404).send('Not found - check Vite dev server');
      });
    }

    // ===== ERROR HANDLING =====
    app.use(globalErrorHandler);

    // ===== START SERVER =====
    app.listen(PORT, () => {
      console.log(`✓ Server running on http://localhost:${PORT}`);
      console.log(`✓ Environment: ${NODE_ENV}`);
    });

    // Graceful shutdown
    process.on('SIGTERM', async () => {
      console.log('SIGTERM received, shutting down gracefully...');
      await db.closeDatabase();
      process.exit(0);
    });

    process.on('SIGINT', async () => {
      console.log('SIGINT received, shutting down gracefully...');
      await db.closeDatabase();
      process.exit(0);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();
