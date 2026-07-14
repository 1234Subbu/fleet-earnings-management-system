import React, { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { DailyReport, DashboardStats } from '../types';
import StatCard from './StatCard';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Users, 
  Coins, 
  Fuel, 
  CheckCircle, 
  AlertCircle, 
  TrendingUp, 
  TrendingDown, 
  Award,
  ListFilter,
  Calendar
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  PieChart, 
  Pie, 
  Cell, 
  BarChart, 
  Bar, 
  AreaChart, 
  Area 
} from 'recharts';
import toast from 'react-hot-toast';

export default function OwnerDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [reports, setReports] = useState<DailyReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTimeframe, setActiveTimeframe] = useState<'today' | 'weekly' | 'monthly' | 'overall'>('today');

  useEffect(() => {
    async function loadDashboardData() {
      try {
        const [statsData, reportsData] = await Promise.all([
          api.getDashboardStats(),
          api.getReports()
        ]);
        setStats(statsData);
        setReports(reportsData.reports || []);
      } catch (err: any) {
        toast.error('Failed to load dashboard data: ' + err.message);
      } finally {
        setLoading(false);
      }
    }
    loadDashboardData();
  }, []);

  if (loading || !stats) {
    return (
      <div className="space-y-6">
        {/* Skeleton grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-28 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl animate-pulse"></div>
          ))}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="h-80 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl animate-pulse"></div>
          <div className="h-80 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl animate-pulse"></div>
        </div>
      </div>
    );
  }

  // Compile Chart Data based on Reports
  // 1. Group daily earnings for the past 7 days
  const last7DaysMap: { [date: string]: { date: string; earnings: number; ownerDue: number; commissions: number; fuel: number } } = {};
  
  // Initialize map with last 7 days of work
  const now = new Date();
  for (let i = 6; i >= 0; i--) {
    const dStr = new Date(now.getTime() - i * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    last7DaysMap[dStr] = { date: dStr, earnings: 0, ownerDue: 0, commissions: 0, fuel: 0 };
  }

  reports.forEach((rep) => {
    if (last7DaysMap[rep.date]) {
      last7DaysMap[rep.date].earnings += rep.totalEarnings;
      last7DaysMap[rep.date].ownerDue += rep.ownerDue;
      last7DaysMap[rep.date].commissions += rep.commissionAmount;
      last7DaysMap[rep.date].fuel += rep.fuelAmount;
    }
  });

  const weeklyTrendData = Object.values(last7DaysMap).sort((a, b) => a.date.localeCompare(b.date));

  // 2. Platform Distribution Calculations
  let totalOla = 0;
  let totalUber = 0;
  let totalRapido = 0;
  let totalOther = 0;

  reports.forEach((rep) => {
    totalOla += rep.olaEarnings;
    totalUber += rep.uberEarnings;
    totalRapido += rep.rapidoEarnings;
    totalOther += rep.otherEarnings;
  });

  const platformDistributionData = [
    { name: 'Ola', value: totalOla, color: '#F59E0B' },
    { name: 'Uber', value: totalUber, color: '#0F172A' },
    { name: 'Rapido', value: totalRapido, color: '#EAB308' },
    { name: 'Other', value: totalOther, color: '#8B5CF6' }
  ].filter(p => p.value > 0);

  // 3. Fuel vs commission distribution map
  let totalCommissionEarned = 0;
  let totalFuelPaid = 0;

  reports.forEach((rep) => {
    totalCommissionEarned += rep.commissionAmount;
    totalFuelPaid += rep.fuelAmount;
  });

  const financialSplitData = [
    { name: 'Driver Commission', value: totalCommissionEarned, color: '#4F46E5' },
    { name: 'Fuel Cost', value: totalFuelPaid, color: '#EF4444' },
    { name: 'Owner Receives', value: reports.reduce((sum, r) => sum + r.ownerDue, 0), color: '#10B981' }
  ];

  return (
    <div className="space-y-6">
      
      {/* Overview Dashboard Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            Fleet Owner Analytics Dashboard
          </h2>
          <p className="text-xs font-semibold text-slate-400 mt-1 flex items-center">
            <Calendar className="h-4 w-4 mr-1 text-slate-400" />
            <span>Real-time operations tracking: {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
          </p>
        </div>
      </div>

      {/* General Fleet Health Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 glass-card rounded-2xl border border-slate-200 dark:border-slate-800 flex items-center justify-between shadow-sm hover:shadow-md transition-all">
          <div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Drivers</span>
            <h3 className="text-2xl font-extrabold text-slate-900 dark:text-white mt-1">{stats.totalDrivers}</h3>
            <p className="text-[10px] text-slate-400 mt-1 font-medium">Registered fleet platform drivers</p>
          </div>
          <div className="p-3 rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400 flex-shrink-0">
            <Users className="h-5 w-5" />
          </div>
        </div>

        <div className="p-5 glass-card rounded-2xl border border-slate-200 dark:border-slate-800 flex items-center justify-between shadow-sm hover:shadow-md transition-all">
          <div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Pending Settlements</span>
            <h3 className="text-2xl font-extrabold text-amber-600 dark:text-amber-400 mt-1">{stats.pendingSettlementsCount}</h3>
            <p className="text-[10px] text-slate-400 mt-1 font-medium">Reports requiring payment verification</p>
          </div>
          <div className="p-3 rounded-xl bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400 flex-shrink-0 animate-pulse">
            <AlertCircle className="h-5 w-5" />
          </div>
        </div>

        <div className="p-5 glass-card rounded-2xl border border-slate-200 dark:border-slate-800 flex items-center justify-between shadow-sm hover:shadow-md transition-all">
          <div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Completed Settlements</span>
            <h3 className="text-2xl font-extrabold text-green-600 dark:text-green-400 mt-1">{stats.completedSettlementsCount}</h3>
            <p className="text-[10px] text-slate-400 mt-1 font-medium">Fully settled work reports</p>
          </div>
          <div className="p-3 rounded-xl bg-green-50 text-green-600 dark:bg-green-950/40 dark:text-green-400 flex-shrink-0">
            <CheckCircle className="h-5 w-5" />
          </div>
        </div>
      </div>

      {/* Interactive Timeframe Analytics Container */}
      <div className="p-6 glass-card rounded-3xl border border-slate-200 dark:border-slate-800 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
          <div>
            <h3 className="font-extrabold text-base text-slate-900 dark:text-white flex items-center space-x-2">
              <Coins className="h-5 w-5 text-indigo-500" />
              <span>Timeframe Performance & Collections Ledger</span>
            </h3>
            <p className="text-xs font-medium text-slate-400 mt-1">
              Select a period to drill down into active earnings, driver commission, fuel expense, and collections.
            </p>
          </div>

          {/* Timeframe Toggle Buttons */}
          <div className="flex flex-wrap p-1 bg-slate-100 dark:bg-slate-950 rounded-xl self-start border border-slate-200/50 dark:border-slate-800">
            {[
              { id: 'today', label: "Today's Work" },
              { id: 'weekly', label: "Weekly Summary" },
              { id: 'monthly', label: "Monthly Summary" },
              { id: 'overall', label: "Overall Totals" }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTimeframe(tab.id as any)}
                className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  activeTimeframe === tab.id
                    ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-sm'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Dynamic Card Grid with Framer Motion Staggered entry */}
        <motion.div 
          layout
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-5"
        >
          <AnimatePresence mode="popLayout">
            {[
              {
                title: activeTimeframe === 'today' ? "Drivers Submitted" : "Drivers Worked",
                value: (activeTimeframe === 'today' ? stats.todaySummary : activeTimeframe === 'weekly' ? stats.weeklySummary : activeTimeframe === 'monthly' ? stats.monthlySummary : stats.overallSummary)?.driversWorked || 0,
                icon: Users,
                gradient: "from-blue-500 to-indigo-600 dark:from-blue-600 dark:to-indigo-800",
                subtitle: activeTimeframe === 'today' ? "Drivers who submitted work today" : "Unique drivers with activity",
              },
              {
                title: "Total Rides Completed",
                value: (activeTimeframe === 'today' ? stats.todaySummary : activeTimeframe === 'weekly' ? stats.weeklySummary : activeTimeframe === 'monthly' ? stats.monthlySummary : stats.overallSummary)?.rides || 0,
                icon: TrendingUp,
                gradient: "from-purple-500 to-pink-600 dark:from-purple-600 dark:to-pink-800",
                subtitle: "Across Ola, Uber, Rapido & Others",
              },
              {
                title: "Total Fare Earnings",
                value: `₹${((activeTimeframe === 'today' ? stats.todaySummary : activeTimeframe === 'weekly' ? stats.weeklySummary : activeTimeframe === 'monthly' ? stats.monthlySummary : stats.overallSummary)?.earnings || 0).toLocaleString()}`,
                icon: Coins,
                gradient: "from-emerald-500 to-teal-600 dark:from-emerald-600 dark:to-teal-800",
                subtitle: "Gross customer ride fares",
              },
              {
                title: "Driver Commissions",
                value: `₹${((activeTimeframe === 'today' ? stats.todaySummary : activeTimeframe === 'weekly' ? stats.weeklySummary : activeTimeframe === 'monthly' ? stats.monthlySummary : stats.overallSummary)?.commission || 0).toLocaleString()}`,
                icon: Award,
                gradient: "from-violet-500 to-purple-600 dark:from-violet-600 dark:to-purple-800",
                subtitle: "Retained by vehicle operators",
              },
              {
                title: "Fuel Expense",
                value: `₹${((activeTimeframe === 'today' ? stats.todaySummary : activeTimeframe === 'weekly' ? stats.weeklySummary : activeTimeframe === 'monthly' ? stats.monthlySummary : stats.overallSummary)?.fuelExpense || 0).toLocaleString()}`,
                icon: Fuel,
                gradient: "from-orange-500 to-red-600 dark:from-orange-600 dark:to-red-800",
                subtitle: "Recorded fuel spending total",
              },
              {
                title: "Owner Receivable",
                value: `₹${((activeTimeframe === 'today' ? stats.todaySummary : activeTimeframe === 'weekly' ? stats.weeklySummary : activeTimeframe === 'monthly' ? stats.monthlySummary : stats.overallSummary)?.ownerReceivable || 0).toLocaleString()}`,
                icon: TrendingUp,
                gradient: "from-cyan-500 to-blue-600 dark:from-cyan-600 dark:to-blue-800",
                subtitle: "Net due to owner before settlement",
              },
              {
                title: "Amount Collected",
                value: `₹${((activeTimeframe === 'today' ? stats.todaySummary : activeTimeframe === 'weekly' ? stats.weeklySummary : activeTimeframe === 'monthly' ? stats.monthlySummary : stats.overallSummary)?.amountCollected || 0).toLocaleString()}`,
                icon: CheckCircle,
                gradient: "from-green-500 to-emerald-600 dark:from-green-600 dark:to-emerald-800",
                subtitle: "Actual cash/UPI collections received",
              },
              {
                title: "Pending Collection",
                value: `₹${((activeTimeframe === 'today' ? stats.todaySummary : activeTimeframe === 'weekly' ? stats.weeklySummary : activeTimeframe === 'monthly' ? stats.monthlySummary : stats.overallSummary)?.pendingCollection || 0).toLocaleString()}`,
                icon: AlertCircle,
                gradient: "from-amber-500 to-orange-600 dark:from-amber-600 dark:to-orange-800",
                subtitle: "Remaining collection balances due",
              },
              {
                title: "Distance Traveled",
                value: `${((activeTimeframe === 'today' ? stats.todaySummary : activeTimeframe === 'weekly' ? stats.weeklySummary : activeTimeframe === 'monthly' ? stats.monthlySummary : stats.overallSummary)?.kilometers || 0).toLocaleString()} KM`,
                icon: TrendingDown,
                gradient: "from-slate-600 to-slate-800 dark:from-slate-700 dark:to-slate-900",
                subtitle: "Total odometer distance recorded",
              }
            ].map((card, idx) => {
              const CardIcon = card.icon;
              return (
                <motion.div
                  key={`${activeTimeframe}-${card.title}`}
                  initial={{ opacity: 0, scale: 0.95, y: 15 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: -15 }}
                  transition={{ duration: 0.35, delay: idx * 0.03, ease: 'easeOut' }}
                  className={`p-5 rounded-[24px] bg-gradient-to-br ${card.gradient} text-white shadow-sm hover:shadow-md hover:-translate-y-1 transform transition-all duration-300 flex flex-col justify-between h-36`}
                >
                  <div className="flex justify-between items-start">
                    <span className="text-[10px] font-bold tracking-wider uppercase opacity-85">
                      {card.title}
                    </span>
                    <div className="p-2 bg-white/10 backdrop-blur-md rounded-xl text-white">
                      <CardIcon className="h-4.5 w-4.5" />
                    </div>
                  </div>
                  <div className="mt-2 space-y-1">
                    <h3 className="text-2xl font-black tracking-tight font-mono">
                      {card.value}
                    </h3>
                    <p className="text-[10px] font-semibold opacity-75 truncate">
                      {card.subtitle}
                    </p>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </motion.div>
      </div>

      {/* Recharts Displays */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Line Chart Trend */}
        <div className="p-5 glass-card rounded-2xl shadow-sm space-y-4">
          <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center space-x-2">
            <TrendingUp className="h-4 w-4 text-blue-500" />
            <span>Weekly Operations Earnings Trend</span>
          </h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={weeklyTrendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" className="dark:hidden" />
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" className="hidden dark:block" />
                <XAxis dataKey="date" tickFormatter={(v) => v.substring(5)} stroke="#94a3b8" fontSize={11} />
                <YAxis stroke="#94a3b8" fontSize={11} />
                <Tooltip 
                  formatter={(value) => [`₹${Number(value).toLocaleString()}`]} 
                  contentStyle={{ borderRadius: '12px' }}
                />
                <Legend wrapperStyle={{ fontSize: '12px' }} />
                <Line type="monotone" dataKey="earnings" name="Total Earnings" stroke="#4F46E5" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                <Line type="monotone" dataKey="ownerDue" name="Owner Due" stroke="#10B981" strokeWidth={2.5} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="fuel" name="Fuel Cost" stroke="#EF4444" strokeWidth={1.5} strokeDasharray="5 5" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Financial Distribution splitting */}
        <div className="p-5 glass-card rounded-2xl shadow-sm space-y-4">
          <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center space-x-2">
            <Coins className="h-4 w-4 text-indigo-500" />
            <span>Revenue Allocation Distribution</span>
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center h-72">
            <div className="h-60 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={financialSplitData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={80}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {financialSplitData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v) => `₹${Number(v).toLocaleString()}`} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            
            <div className="space-y-3">
              {financialSplitData.map((item, i) => {
                const total = financialSplitData.reduce((sum, item) => sum + item.value, 0);
                const percent = total > 0 ? ((item.value / total) * 100).toFixed(1) : '0';
                return (
                  <div key={i} className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: item.color }}></span>
                      <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">{item.name}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-bold block">₹{item.value.toLocaleString()}</span>
                      <span className="text-[10px] text-slate-400 font-bold">{percent}%</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Platform Share Market Pie */}
        <div className="lg:col-span-1 p-5 glass-card rounded-2xl shadow-sm space-y-4">
          <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center space-x-2">
            <Award className="h-4 w-4 text-amber-500" />
            <span>Platform Earnings Share</span>
          </h3>
          
          {platformDistributionData.length === 0 ? (
            <p className="text-xs text-slate-400 italic text-center py-20">No platform earnings reported yet.</p>
          ) : (
            <div className="space-y-4">
              <div className="h-44">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={platformDistributionData}
                      cx="50%"
                      cy="50%"
                      innerRadius={45}
                      outerRadius={65}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {platformDistributionData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v) => `₹${Number(v).toLocaleString()}`} />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div className="space-y-2">
                {platformDistributionData.map((p, idx) => {
                  const total = platformDistributionData.reduce((s, x) => s + x.value, 0);
                  const pShare = ((p.value / total) * 100).toFixed(1);
                  return (
                    <div key={idx} className="flex items-center justify-between text-xs">
                      <div className="flex items-center space-x-1.5">
                        <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: p.color }}></span>
                        <span className="font-semibold text-slate-600 dark:text-slate-300">{p.name}</span>
                      </div>
                      <span className="font-mono font-bold">₹{p.value.toLocaleString()} ({pShare}%)</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Stacked comparison bar chart */}
        <div className="lg:col-span-2 p-5 glass-card rounded-2xl shadow-sm space-y-4">
          <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center space-x-2">
            <Fuel className="h-4 w-4 text-emerald-500" />
            <span>Operational Split Comparison (Last 7 Days)</span>
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weeklyTrendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" className="dark:hidden" />
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" className="hidden dark:block" />
                <XAxis dataKey="date" tickFormatter={(v) => v.substring(5)} stroke="#94a3b8" fontSize={11} />
                <YAxis stroke="#94a3b8" fontSize={11} />
                <Tooltip formatter={(v) => `₹${Number(v).toLocaleString()}`} />
                <Legend wrapperStyle={{ fontSize: '11px' }} />
                <Bar dataKey="ownerDue" name="Owner Due" fill="#10B981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="commissions" name="Driver Comm" fill="#4F46E5" radius={[4, 4, 0, 0]} />
                <Bar dataKey="fuel" name="Fuel Paid" fill="#EF4444" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>

    </div>
  );
}
