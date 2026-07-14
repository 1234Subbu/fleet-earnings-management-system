# Fleet Earnings Management System

A modern web application for managing fleet vehicles, drivers, earnings tracking, and commission settings. Built with React, TypeScript, and Express.

## Overview

The Fleet Earnings Management System is designed to help fleet owners and operators efficiently manage:

- **Drivers** - Add, edit, and track driver information
- **Vehicles** - Manage fleet vehicles and their assignments
- **Earnings Reports** - Track and manage driver earnings and trip reports
- **Commission Settings** - Configure commission rates and payment structures
- **Dashboard Analytics** - View real-time statistics and performance metrics

## Key Features

✅ **Role-Based Access Control** - Separate dashboards for Owners and Drivers  
✅ **Secure Authentication** - JWT-based login with bcrypt password hashing  
✅ **Real-time Analytics** - Interactive charts and performance metrics  
✅ **Dark Mode Support** - Modern dark theme for comfortable viewing  
✅ **Responsive Design** - Works seamlessly on desktop and mobile  
✅ **Data Management** - Full CRUD operations for drivers, vehicles, and reports

## Tech Stack

- **Frontend**: React 19, TypeScript, Vite
- **Backend**: Express.js, Node.js
- **Styling**: Tailwind CSS with Motion animations
- **Database**: JSON-based (easily upgradeable to SQL/NoSQL)
- **Authentication**: JWT + bcryptjs
- **Charts**: Recharts for data visualization
- **UI Components**: Lucide React icons, custom React components

## Prerequisites

- Node.js 18+
- npm or yarn

## Installation & Setup

1. **Clone the repository**

   ```bash
   git clone <your-repo-url>
   cd fleet-earnings-management-system
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Configure environment (if needed)**

   ```bash
   cp .env.example .env.local
   ```

4. **Run locally**
   ```bash
   npm run dev
   ```
   The app will be available at `http://localhost:5173`

## Available Scripts

- `npm run dev` - Start the development server with hot reload
- `npm run build` - Build for production
- `npm run start` - Start the production server
- `npm run lint` - Check TypeScript types
- `npm run clean` - Clean build artifacts

## Project Structure

```
├── src/                           # Frontend React application
│   ├── components/               # Reusable React components
│   │   ├── LoginScreen.tsx       # Authentication UI
│   │   ├── OwnerDashboard.tsx    # Owner dashboard view
│   │   ├── DriverDashboard.tsx   # Driver dashboard view
│   │   ├── DriversView.tsx       # Driver management
│   │   ├── VehiclesView.tsx      # Vehicle management
│   │   ├── ReportsView.tsx       # Earnings reports
│   │   └── ...
│   ├── lib/                      # Utilities and API calls
│   ├── App.tsx                   # Main app component
│   └── main.tsx                  # Entry point
├── server/                        # Backend Express server
│   └── db.ts                     # Database operations
├── data/                          # Data storage
│   ├── users.json               # User accounts
│   ├── drivers.json             # Driver information
│   ├── vehicles.json            # Vehicle data
│   └── reports.json             # Earnings reports
├── server.ts                      # Express server setup
├── tsconfig.json                 # TypeScript configuration
├── vite.config.ts               # Vite configuration
└── package.json                 # Dependencies and scripts
```

## User Roles

### Owner

- View comprehensive dashboard with fleet statistics
- Manage drivers and vehicles
- View all earnings reports
- Configure commission settings
- Monitor fleet performance

### Driver

- View personal earnings and reports
- Submit new earnings reports
- View assigned vehicles
- Track personal statistics

## Getting Started Guide

### First Time Login

Default demo account (modify in production):

- Username: `owner` | Password: `owner123`
- Username: `driver` | Password: `driver123`

### Add New Driver

1. Go to **Drivers** section
2. Click **Add Driver** button
3. Fill in driver details
4. Set commission rate
5. Save

### Create Earnings Report

1. Go to **Reports** section
2. Click **Add Report** button
3. Enter trip details and earnings
4. Submit for approval

## Deployment

### Build for Production

```bash
npm run build
```

### Deploy to Cloud

This app can be deployed to:

- **Azure App Service** - Follow Azure deployment guide
- **Vercel** - Supports Node.js + React
- **Netlify** - With serverless functions for backend
- **Docker** - See Dockerfile in the repository (if available)

## Database

Currently uses JSON files for data storage. For production, consider migrating to:

- PostgreSQL
- MongoDB
- Azure SQL Database
- Firebase

## Future Enhancements

- [ ] Email notifications for reports
- [ ] PDF export for reports
- [ ] Payment gateway integration
- [ ] Advanced analytics and reporting
- [ ] Mobile app
- [ ] Real-time notifications

## License

This project is private/internal use only. Modify as needed for your organization.

## Support

For issues or questions, please contact the development team or create an issue in the repository.

---

**Last Updated**: 2026-07-14
