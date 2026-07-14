import React, { useState } from 'react';
import { useAuth } from './AuthContext';
import { 
  LayoutDashboard, 
  FileText, 
  Users, 
  Car, 
  Settings, 
  LogOut, 
  Menu, 
  X, 
  DollarSign 
} from 'lucide-react';

interface LayoutProps {
  currentView: string;
  onViewChange: (view: string) => void;
  children: React.ReactNode;
}

export default function Layout({ currentView, onViewChange, children }: LayoutProps) {
  const { user, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  if (!user) return <>{children}</>;

  const isOwner = user.role === 'Owner';

  const menuItems = isOwner ? [
    { id: 'dashboard', name: 'Dashboard', icon: LayoutDashboard },
    { id: 'reports', name: 'Daily Reports', icon: FileText },
    { id: 'drivers', name: 'Drivers', icon: Users },
    { id: 'vehicles', name: 'Vehicles', icon: Car },
    { id: 'settings', name: 'Commission Rules', icon: Settings },
  ] : [
    { id: 'dashboard', name: 'Dashboard', icon: LayoutDashboard },
    { id: 'reports', name: 'My Reports', icon: FileText },
    { id: 'submit-report', name: 'Submit Daily Report', icon: DollarSign },
  ];

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-transparent text-slate-900 dark:text-slate-100 transition-colors duration-200">
      
      {/* Mobile Top Header */}
      <header className="md:hidden flex items-center justify-between px-4 py-3 glass-panel border-b border-white/25 dark:border-white/5 sticky top-0 z-40 shadow-sm">
        <div className="flex items-center space-x-2">
          <div className="p-2 bg-blue-600 rounded-lg text-white">
            <Car className="h-5 w-5" />
          </div>
          <span className="font-bold text-lg tracking-tight">Balaji Travels</span>
        </div>
        <div className="flex items-center space-x-3">
          <button 
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 rounded-lg text-slate-600 dark:text-slate-300 focus:outline-none"
          >
            {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </header>

      {/* Mobile Navigation Drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-30 md:hidden bg-slate-950/40 backdrop-blur-sm" onClick={() => setMobileMenuOpen(false)}>
          <div 
            className="fixed top-[53px] left-0 bottom-0 w-64 glass-panel border-r border-white/25 dark:border-white/5 flex flex-col p-4 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="pb-4 border-b border-white/20 dark:border-white/5">
              <p className="font-semibold text-slate-900 dark:text-white truncate">{user.name}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium capitalize mt-0.5">{user.role}</p>
            </div>
            
            <nav className="flex-1 space-y-1">
              {menuItems.map((item) => {
                const Icon = item.icon;
                const isActive = currentView === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      onViewChange(item.id);
                      setMobileMenuOpen(false);
                    }}
                    className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-xl font-medium transition-all ${
                      isActive 
                        ? 'bg-blue-600/15 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300 border border-blue-500/20 shadow-sm' 
                        : 'text-slate-600 dark:text-slate-400 hover:bg-white/40 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    <Icon className="h-5 w-5" />
                    <span>{item.name}</span>
                  </button>
                );
              })}
            </nav>

            <button
              onClick={logout}
              className="flex items-center space-x-3 px-3 py-2.5 w-full rounded-xl text-red-600 dark:text-red-400 font-medium hover:bg-red-500/10 dark:hover:bg-red-950/20 transition-all border-t border-white/20 dark:border-white/5 pt-4"
            >
              <LogOut className="h-5 w-5" />
              <span>Log Out</span>
            </button>
          </div>
        </div>
      )}

      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-64 glass-panel border-r border-white/25 dark:border-white/5 h-screen sticky top-0 p-5 flex-shrink-0">
        <div className="flex items-center space-x-2.5 mb-8">
          <div className="p-2 bg-blue-600 rounded-xl text-white shadow-lg shadow-blue-500/25">
            <Car className="h-6 w-6" />
          </div>
          <div>
            <h1 className="font-bold text-lg leading-tight tracking-tight">Balaji Travels</h1>
            <p className="text-[10px] font-semibold text-slate-400 tracking-wider uppercase">Earnings Hub</p>
          </div>
        </div>

        {/* User Information */}
        <div className="mb-6 p-4 glass-card rounded-2xl">
          <p className="font-semibold text-sm truncate text-slate-800 dark:text-slate-200">{user.name}</p>
          <div className="mt-1.5">
            <span className="inline-block text-[10px] font-semibold tracking-wide uppercase px-2 py-0.5 rounded-full bg-blue-600/10 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300">
              {user.role}
            </span>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1.5">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onViewChange(item.id)}
                className={`w-full flex items-center space-x-3 px-3.5 py-3 rounded-xl font-medium text-sm transition-all ${
                  isActive 
                    ? 'bg-blue-600/15 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300 border border-blue-500/20 shadow-sm' 
                    : 'text-slate-600 dark:text-slate-400 hover:bg-white/40 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Icon className="h-5 w-5" />
                <span>{item.name}</span>
              </button>
            );
          })}
        </nav>

        {/* Logout Bottom */}
        <button
          onClick={logout}
          className="flex items-center space-x-3 px-3.5 py-3 w-full rounded-xl text-red-600 dark:text-red-400 font-medium text-sm hover:bg-red-500/10 dark:hover:bg-red-950/20 transition-all border-t border-white/20 dark:border-white/5 pt-5 mt-auto"
        >
          <LogOut className="h-5 w-5" />
          <span>Log Out</span>
        </button>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 p-4 md:p-8 overflow-y-auto max-w-7xl mx-auto w-full">
        {children}
      </main>
    </div>
  );
}
