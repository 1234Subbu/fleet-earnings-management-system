# Production Setup Quick Start

This guide helps you get your Fleet Earnings Management System ready for production with security and database migration.

## 🚀 Quick Start (5 minutes)

### 1. Prerequisites Check

```bash
# Check Node.js version (should be 18+)
node --version

# Check npm version
npm --version

# PostgreSQL installed?
psql --version
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Create PostgreSQL Database

**Local Setup:**
```bash
# Create database
createdb fleet_db
createuser fleet_user
psql -c "ALTER USER fleet_user WITH PASSWORD 'your_secure_password';"
psql fleet_db -c "GRANT ALL PRIVILEGES ON DATABASE fleet_db TO fleet_user;"
```

**Cloud Setup:**
- **Azure**: Azure Database for PostgreSQL (https://docs.microsoft.com/en-us/azure/postgresql/)
- **Vercel Postgres**: https://vercel.com/storage/postgres
- **Railway**: https://railway.app
- **Neon**: https://neon.tech

### 4. Configure Environment

```bash
cp .env.example .env.local
```

Edit `.env.local`:
```env
DATABASE_URL=postgresql://fleet_user:password@localhost:5432/fleet_db
JWT_SECRET=your_secret_key_here_at_least_32_characters_long
APP_URL=http://localhost:5173
NODE_ENV=development
```

**Generate a secure JWT_SECRET:**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 5. Initialize Database

```bash
# Create tables
psql -U fleet_user -d fleet_db -f server/schema.sql

# If migrating from JSON:
npm run migrate
```

### 6. Run Locally

```bash
npm run dev
```

Visit: http://localhost:5173

**Default credentials:**
- Username: `owner` | Password: `owner123`
- Username: `driver1` | Password: `driver123`

---

## 🔐 Security Setup

### Change Default Passwords

```bash
# Login as owner
# Go to Settings → Change Password
# Set a strong password (min 8 chars, uppercase, lowercase, number, special char)
```

### Enable HTTPS (Production)

All cloud deployments (Vercel, Azure) automatically provide HTTPS.

### Rate Limiting

Configured in `server/security.ts` - limits to 100 requests per 15 minutes

### CORS Configuration

Edit `.env`:
```env
ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com
```

---

## 📦 Build for Production

```bash
npm run build
```

This creates:
- Frontend: `dist/index.html` (static files)
- Backend: `dist/server.cjs` (Node.js server)

---

## 🌐 Deployment Options

### Option 1: Vercel (Easiest)

```bash
# Install Vercel CLI
npm install -g vercel

# Deploy
vercel

# Set environment variables in Vercel dashboard
```

**Cost**: Free tier available (limited)

### Option 2: Azure App Service

```bash
# Install Azure CLI
# https://docs.microsoft.com/en-us/cli/azure/install-azure-cli

# Login
az login

# Deploy
az webapp up --name fleet-earnings-app --runtime node:18-lts --resource-group your-rg
```

**Cost**: ~$10-30/month for small app

### Option 3: Railway.app

```bash
# Sign up at railway.app
# Connect GitHub repo
# Add PostgreSQL service
# Deploy
```

**Cost**: Pay-as-you-go, ~$5-20/month

### Option 4: Self-Hosted (DigitalOcean, Linode)

```bash
# Create Droplet with Node.js
# Install PostgreSQL
# Git clone repository
# npm install && npm run build
# Use PM2 or systemd to manage process
# Set up Nginx reverse proxy
# Get SSL certificate (Let's Encrypt)
```

**Cost**: ~$5-20/month

---

## 🔍 Monitoring & Logs

### Vercel Logs
```bash
vercel logs production
```

### Azure Logs
```bash
az webapp log tail --resource-group fleet-rg --name fleet-earnings-app
```

### Local Logs
```bash
tail -f /path/to/logs/app.log
```

---

## 🆘 Troubleshooting

### "Connection refused" Error
```
Check DATABASE_URL is correct and PostgreSQL is running
psql $DATABASE_URL -c "SELECT 1"
```

### "JWT_SECRET not set"
```
Set JWT_SECRET in .env.local or environment variables
```

### "Port already in use"
```
PORT=3001 npm run dev
# Or kill process: lsof -ti:3000 | xargs kill -9
```

### "Database migration failed"
```
Check permissions: GRANT ALL ON DATABASE fleet_db TO fleet_user
Verify connection: psql -U fleet_user -d fleet_db
```

---

## ✅ Production Checklist

- [ ] PostgreSQL database created and accessible
- [ ] `.env.local` with secure JWT_SECRET
- [ ] Application runs locally: `npm run dev`
- [ ] Build succeeds: `npm run build`
- [ ] Database migration completed: `npm run migrate`
- [ ] Changed default admin password
- [ ] Set up HTTPS/SSL
- [ ] Configured CORS for production domain
- [ ] Database backups configured
- [ ] Monitoring/logging set up
- [ ] Tested login with production credentials
- [ ] Tested report creation workflow
- [ ] Verified all user roles work (Owner, Driver)

---

## 📚 Full Documentation

- [DEPLOYMENT.md](./DEPLOYMENT.md) - Complete deployment guide
- [README.md](./README.md) - Feature overview
- [server/security.ts](./server/security.ts) - Security utilities
- [server/schema.sql](./server/schema.sql) - Database schema

---

## 🆘 Need Help?

1. Check error logs: `npm run dev` shows detailed errors
2. Verify database: `psql -U fleet_user -d fleet_db -c "SELECT COUNT(*) FROM users"`
3. Test API: `curl -X POST http://localhost:3000/api/auth/login -H "Content-Type: application/json" -d '{"username":"owner","password":"owner123"}'`
4. Read DEPLOYMENT.md for detailed instructions

---

**Ready to ship? 🚀 Remember: Security first, always!**
