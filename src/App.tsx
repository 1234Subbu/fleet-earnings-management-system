import React, { useState } from 'react';
import { ThemeProvider } from './components/ThemeContext';
import { AuthProvider, useAuth } from './components/AuthContext';
import Layout from './components/Layout';
import LoginScreen from './components/LoginScreen';
import OwnerDashboard from './components/OwnerDashboard';
import DriverDashboard from './components/DriverDashboard';
import ReportsView from './components/ReportsView';
import DriversView from './components/DriversView';
import VehiclesView from './components/VehiclesView';
import CommissionSettingsView from './components/CommissionSettingsView';
import AddReportForm from './components/AddReportForm';
import { Toaster } from 'react-hot-toast';
import { Car } from 'lucide-react';

function DashboardRouter() {
  const { user, loading } = useAuth();
  const [currentView, setCurrentView] = useState('dashboard');

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-950 p-6 transition-colors">
        <div className="relative flex items-center justify-center">
          <div className="h-16 w-16 border-4 border-blue-600/30 border-t-blue-600 rounded-full animate-spin"></div>
          <div className="absolute p-3 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-850 rounded-2xl shadow-md">
            <Car className="h-6 w-6 text-blue-600 animate-pulse" />
          </div>
        </div>
        <p className="mt-6 text-sm font-bold text-slate-500 dark:text-slate-400 tracking-wide uppercase">
          Initializing secure terminal...
        </p>
      </div>
    );
  }

  if (!user) {
    return <LoginScreen />;
  }

  const isOwner = user.role === 'Owner';

  const renderActiveView = () => {
    if (isOwner) {
      switch (currentView) {
        case 'dashboard':
          return <OwnerDashboard />;
        case 'reports':
          return <ReportsView />;
        case 'drivers':
          return <DriversView />;
        case 'vehicles':
          return <VehiclesView />;
        case 'settings':
          return <CommissionSettingsView />;
        default:
          return <OwnerDashboard />;
      }
    } else {
      switch (currentView) {
        case 'dashboard':
          return <DriverDashboard onViewChange={setCurrentView} />;
        case 'reports':
          return <ReportsView />;
        case 'submit-report':
          return (
            <div className="space-y-4">
              <h3 className="font-extrabold text-slate-900 dark:text-white">Submit New Daily Report</h3>
              <AddReportForm onSuccess={() => setCurrentView('dashboard')} onCancel={() => setCurrentView('dashboard')} />
            </div>
          );
        default:
          return <DriverDashboard onViewChange={setCurrentView} />;
      }
    }
  };

  return (
    <Layout currentView={currentView} onViewChange={setCurrentView}>
      {renderActiveView()}
    </Layout>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <DashboardRouter />
        <Toaster 
          position="top-right"
          toastOptions={{
            style: {
              background: '#0F172A',
              color: '#F8FAFC',
              borderRadius: '12px',
              fontSize: '13px',
              fontWeight: '500',
            },
            success: {
              iconTheme: {
                primary: '#10B981',
                secondary: '#0F172A',
              },
            },
            error: {
              iconTheme: {
                primary: '#EF4444',
                secondary: '#0F172A',
              },
            }
          }}
        />
      </AuthProvider>
    </ThemeProvider>
  );
}
