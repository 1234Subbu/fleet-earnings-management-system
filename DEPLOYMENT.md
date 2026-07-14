# Production Deployment & Database Migration Guide

## Overview

This guide covers migrating from JSON file storage to PostgreSQL and deploying the Fleet Earnings Management System to production.

## Prerequisites

- Node.js 18+
- PostgreSQL 12+ (local or cloud)
- Git
- Cloud account (Vercel, Azure, or similar)

---

## Part 1: Local PostgreSQL Setup

### Step 1: Install PostgreSQL

**Windows:**
```bash
# Using Chocolatey
choco install postgresql
```

**macOS:**
```bash
# Using Homebrew
brew install postgresql
brew services start postgresql
```

**Linux (Ubuntu):**
```bash
sudo apt-get update
sudo apt-get install postgresql postgresql-contrib
sudo service postgresql start
```

### Step 2: Create Database

```bash
# Connect to PostgreSQL
psql -U postgres

# Create database
CREATE DATABASE fleet_db;
CREATE USER fleet_user WITH PASSWORD 'your_secure_password_here';
ALTER ROLE fleet_user SET client_encoding TO 'utf8';
ALTER ROLE fleet_user SET default_transaction_isolation TO 'read committed';
ALTER ROLE fleet_user SET default_transaction_deferrable TO on;
ALTER ROLE fleet_user SET default_transaction_read_only TO off;
GRANT ALL PRIVILEGES ON DATABASE fleet_db TO fleet_user;

# Exit psql
\q
```

### Step 3: Initialize Database Schema

```bash
# Connect to the new database as fleet_user
psql -U fleet_user -d fleet_db -h localhost

# Run the schema
\i server/schema.sql

# Verify tables were created
\dt

# Exit
\q
```

---

## Part 2: Local Development Setup

### Step 1: Update Environment Variables

```bash
# Create or update .env.local
cp .env.example .env.local
```

Edit `.env.local`:
```env
NODE_ENV=development
DATABASE_URL=postgresql://fleet_user:your_password@localhost:5432/fleet_db
JWT_SECRET=your_development_secret_key_minimum_32_chars_here
APP_URL=http://localhost:5173
PORT=3000
```

### Step 2: Install Dependencies

```bash
npm install
```

### Step 3: Migrate Data from JSON

```bash
# Create migration script
node scripts/migrate-json-to-postgres.js
```

**Sample migration script** (`scripts/migrate-json-to-postgres.js`):
```javascript
import pkg from 'pg';
import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';

const { Pool } = pkg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function migrateData() {
  try {
    console.log('Starting migration from JSON to PostgreSQL...');

    // Load JSON files
    const usersPath = path.join(process.cwd(), 'data/users.json');
    const vehiclesPath = path.join(process.cwd(), 'data/vehicles.json');
    const reportsPath = path.join(process.cwd(), 'data/reports.json');
    const settingsPath = path.join(process.cwd(), 'data/settings.json');

    const users = JSON.parse(fs.readFileSync(usersPath, 'utf-8'));
    const vehicles = JSON.parse(fs.readFileSync(vehiclesPath, 'utf-8') || '[]');
    const reports = JSON.parse(fs.readFileSync(reportsPath, 'utf-8') || '[]');
    const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf-8') || '{}');

    // Migrate users
    for (const user of users) {
      await pool.query(
        `INSERT INTO users (id, username, name, role, status, password_hash)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (id) DO NOTHING`,
        [user.id, user.username, user.name, user.role, user.status, user.passwordHash]
      );
    }
    console.log(`✓ Migrated ${users.length} users`);

    // Migrate vehicles
    if (vehicles.length > 0) {
      for (const vehicle of vehicles) {
        await pool.query(
          `INSERT INTO vehicles (id, vehicle_number, vehicle_name, brand, model, insurance_expiry, status)
           VALUES ($1, $2, $3, $4, $5, $6, $7)
           ON CONFLICT (id) DO NOTHING`,
          [vehicle.id, vehicle.vehicleNumber, vehicle.vehicleName, vehicle.brand, vehicle.model, vehicle.insuranceExpiry, vehicle.status]
        );
      }
      console.log(`✓ Migrated ${vehicles.length} vehicles`);
    }

    // Migrate reports
    if (reports.length > 0) {
      for (const report of reports) {
        await pool.query(
          `INSERT INTO daily_reports (id, driver_id, driver_name, report_date, vehicle_id, vehicle_number, total_earnings, commission_amount, driver_keeps, owner_due, settlement_status)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
           ON CONFLICT (id) DO NOTHING`,
          [report.id, report.driverId, report.driverName, report.date, report.vehicleId, report.vehicleNumber, report.totalEarnings, report.commissionAmount, report.driverKeeps, report.ownerDue, report.settlementStatus]
        );
      }
      console.log(`✓ Migrated ${reports.length} reports`);
    }

    console.log('✓ Migration completed successfully!');
    await pool.end();
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

migrateData();
```

### Step 4: Run Development Server

```bash
# Update package.json to use server-prod.ts in dev
npm run dev

# Server will start at http://localhost:3000
```

---

## Part 3: Production Deployment (Vercel)

### Step 1: Prepare for Deployment

```bash
# Update server.ts to use server-prod.ts
# Or rename server-prod.ts to server.ts

# Install Vercel CLI
npm install -g vercel
```

### Step 2: Deploy to Vercel

```bash
# Login to Vercel
vercel login

# Deploy
vercel

# Follow prompts to:
# 1. Link to Git repository
# 2. Set up environment variables
# 3. Deploy
```

### Step 3: Set Production Environment Variables in Vercel Dashboard

Go to `Settings > Environment Variables`:

```
DATABASE_URL: postgresql://fleet_user:password@host:port/fleet_db
JWT_SECRET: your_production_secret_key_minimum_32_chars
APP_URL: https://your-vercel-domain.vercel.app
NODE_ENV: production
ALLOWED_ORIGINS: https://your-vercel-domain.vercel.app
```

### Step 4: Database Setup for Production

**Option A: Azure Database for PostgreSQL**

```bash
# Create Azure PostgreSQL database
az postgres server create \
  --resource-group your-rg \
  --name fleet-db-server \
  --location eastus \
  --admin-user fleet_admin \
  --admin-password YourStrongPassword123! \
  --sku-name B_Gen5_1 \
  --storage-size 51200
```

**Option B: Heroku PostgreSQL**

```bash
# Create Heroku app
heroku create your-app-name

# Add PostgreSQL add-on
heroku addons:create heroku-postgresql:standard-0 -a your-app-name

# Get connection string
heroku config:get DATABASE_URL -a your-app-name
```

**Option C: Cloud-Hosted (neon.tech, railway.app)**

Sign up and create a PostgreSQL database, copy the connection string.

---

## Part 4: Production Deployment (Azure)

### Step 1: Create Azure Resources

```bash
# Login to Azure
az login

# Create resource group
az group create --name fleet-rg --location eastus

# Create App Service Plan
az appservice plan create \
  --name fleet-app-plan \
  --resource-group fleet-rg \
  --sku B1 --is-linux

# Create Web App
az webapp create \
  --resource-group fleet-rg \
  --plan fleet-app-plan \
  --name fleet-earnings-app \
  --runtime "NODE|18-lts"

# Create PostgreSQL Flexible Server
az postgres flexible-server create \
  --resource-group fleet-rg \
  --name fleet-db \
  --location eastus \
  --admin-user fleet_admin \
  --admin-password YourStrongPassword123! \
  --sku-name Standard_B1ms \
  --storage-size 32
```

### Step 2: Set Environment Variables in Azure

```bash
az webapp config appsettings set \
  --resource-group fleet-rg \
  --name fleet-earnings-app \
  --settings \
    NODE_ENV=production \
    DATABASE_URL="postgresql://fleet_admin:YourPassword@fleet-db.postgres.database.azure.com:5432/fleet_db" \
    JWT_SECRET="your_secure_key" \
    APP_URL="https://fleet-earnings-app.azurewebsites.net"
```

### Step 3: Deploy from Git

```bash
# Setup Git deployment
az webapp deployment source config-zip \
  --resource-group fleet-rg \
  --name fleet-earnings-app \
  --src deployment.zip

# Or use GitHub Actions (see .github/workflows/azure-deploy.yml)
```

---

## Part 5: Security Hardening Checklist

- [ ] Change default admin password
- [ ] Set strong JWT_SECRET (minimum 32 characters)
- [ ] Enable HTTPS/SSL
- [ ] Set up firewall rules for database
- [ ] Enable database backups (daily recommended)
- [ ] Configure CORS for specific domains
- [ ] Enable rate limiting (configured in code)
- [ ] Set up monitoring and logging
- [ ] Enable audit logging in database
- [ ] Regular security updates for dependencies

---

## Part 6: Backup & Disaster Recovery

### PostgreSQL Backup

```bash
# Manual backup
pg_dump -U fleet_user -h localhost fleet_db > backup.sql

# Restore from backup
psql -U fleet_user -h localhost fleet_db < backup.sql

# Automated backups (cron job on Linux)
# Add to crontab: 0 2 * * * pg_dump -U fleet_user fleet_db | gzip > /backups/fleet_db_$(date +\%Y\%m\%d).sql.gz
```

### Vercel Deployment Rollback

```bash
# View deployments
vercel list

# Rollback to previous deployment
vercel rollback
```

---

## Part 7: Monitoring & Troubleshooting

### Check Application Logs

**Vercel:**
```bash
vercel logs production
```

**Azure:**
```bash
az webapp log tail --resource-group fleet-rg --name fleet-earnings-app
```

### Database Health Check

```bash
# Connect to production database
psql -U fleet_user -h your-host -d fleet_db

# Check table row counts
SELECT 'users' as table_name, COUNT(*) FROM users
UNION ALL
SELECT 'vehicles', COUNT(*) FROM vehicles
UNION ALL
SELECT 'daily_reports', COUNT(*) FROM daily_reports;
```

---

## Troubleshooting

### Connection Refused
```
Error: connect ECONNREFUSED
Solution: Check DATABASE_URL and ensure PostgreSQL is running
```

### JWT Token Expired
```
Solution: Increase JWT_EXPIRY or implement token refresh
```

### File Upload Failed
```
Solution: Check UPLOAD_DIR permissions and disk space
```

---

## Next Steps

1. ✅ Set up local PostgreSQL
2. ✅ Run migrations
3. ✅ Test locally with production config
4. ✅ Deploy to staging environment
5. ✅ Run integration tests
6. ✅ Deploy to production
7. ✅ Monitor for issues
8. ✅ Set up backups

---

**Questions?** Check the [README.md](../README.md) or review [security best practices](./security.ts).
