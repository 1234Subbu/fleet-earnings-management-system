import React, { useEffect, useState } from 'react';
import { useAuth } from './AuthContext';
import { api } from '../lib/api';
import { DailyReport } from '../types';
import StatCard from './StatCard';
import AddReportForm from './AddReportForm';
import ReportDetailModal from './ReportDetailModal';
import { 
  Car, 
  Calendar, 
  Coins, 
  Award, 
  TrendingUp, 
  PlusCircle, 
  CheckCircle, 
  FileText, 
  AlertCircle,
  HelpCircle,
  ChevronRight,
  Gauge,
  Percent,
  Compass
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function DriverDashboard({ onViewChange }: { onViewChange: (view: string) => void }) {
  const { user } = useAuth();
  const [driverStats, setDriverStats] = useState<any>(null);
  const [recentReports, setRecentReports] = useState<DailyReport[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedReport, setSelectedReport] = useState<DailyReport | null>(null);
  const [activeTab, setActiveTab] = useState<'today' | 'weekly' | 'monthly'>('today');

  const fetchDriverDashboard = async () => {
    try {
      const [statsData, reportsData] = await Promise.all([
        api.getDashboardStats(),
        api.getReports({ limit: 5 }) // fetch recent
      ]);
      setDriverStats(statsData);
      setRecentReports(reportsData.reports || []);
    } catch (err: any) {
      toast.error('Failed to load driver dashboard: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDriverDashboard();
  }, []);

  const handleReportSuccess = () => {
    setShowAddForm(false);
    setLoading(true);
    fetchDriverDashboard();
  };

  if (loading || !driverStats) {
    return (
      <div className="space-y-6">
        <div className="h-32 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl animate-pulse"></div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-28 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl animate-pulse"></div>
          ))}
        </div>
      </div>
    );
  }

  const { hasTodayReport, todayReport, pendingSettlementsCount, weeklySummary, monthlySummary } = driverStats;
  const todayStr = new Date().toISOString().split('T')[0];

  // Derive Today's summary
  const todaySummary = {
    rides: todayReport ? todayReport.totalRides : 0,
    earnings: todayReport ? todayReport.totalEarnings : 0,
    commission: todayReport ? todayReport.commissionAmount : 0,
    fuelExpense: todayReport ? todayReport.fuelAmount : 0,
    ownerDue: todayReport ? todayReport.ownerDue : 0,
    kilometers: todayReport && todayReport.startingKM !== undefined && todayReport.endingKM !== undefined ? Math.max(0, todayReport.endingKM - todayReport.startingKM) : 0,
  };

  const getActiveSummary = () => {
    switch (activeTab) {
      case 'today':
        return todaySummary;
      case 'weekly':
        return weeklySummary || { rides: 0, earnings: 0, commission: 0, fuelExpense: 0, ownerDue: 0, kilometers: 0 };
      case 'monthly':
        return monthlySummary || { rides: 0, earnings: 0, commission: 0, fuelExpense: 0, ownerDue: 0, kilometers: 0 };
    }
  };

  const currentStats = getActiveSummary();
  const avgEarningsPerRide = currentStats.rides > 0 ? Math.round(currentStats.earnings / currentStats.rides) : 0;
  const avgEarningsPerKM = currentStats.kilometers > 0 ? Math.round(currentStats.earnings / currentStats.kilometers) : 0;

  return (
    <div className="space-y-6">
      
      {/* Welcome Card & Greetings */}
      <div className="p-6 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-3xl shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-xl font-extrabold tracking-tight">
              Hello, {user?.name}!
            </h2>
            <p className="text-xs font-semibold text-blue-100 mt-1">
              Drive safely on the roads today. Remember to upload all platform screenshots.
            </p>
          </div>
          
          {!showAddForm && !hasTodayReport && (
            <button
              onClick={() => setShowAddForm(true)}
              className="px-5 py-2.5 bg-white text-blue-600 font-bold rounded-xl text-xs shadow hover:bg-slate-50 transition-all flex items-center space-x-1.5 self-start"
            >
              <PlusCircle className="h-4.5 w-4.5" />
              <span>Submit Today's Earnings</span>
            </button>
          )}
        </div>

        {/* Status prompt */}
        <div className="pt-4 border-t border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs font-semibold">
          <div className="flex items-center space-x-2">
            <Calendar className="h-4 w-4 text-blue-200" />
            <span>Today's Date: {todayStr}</span>
          </div>

          <div className="flex items-center space-x-1.5">
            {hasTodayReport ? (
              <span className="flex items-center text-green-200 bg-green-500/20 px-2.5 py-1 rounded-full">
                <CheckCircle className="h-4 w-4 mr-1" /> Today's Report Submitted
              </span>
            ) : (
              <span className="flex items-center text-amber-200 bg-amber-500/20 px-2.5 py-1 rounded-full">
                <AlertCircle className="h-4 w-4 mr-1" /> No report submitted today
              </span>
            )}
          </div>
        </div>
      </div>

      {showAddForm ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-extrabold text-slate-900 dark:text-white">Submit New Daily Report</h3>
            <button 
              onClick={() => setShowAddForm(false)}
              className="text-xs font-bold text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              Cancel
            </button>
          </div>
          <AddReportForm onSuccess={handleReportSuccess} onCancel={() => setShowAddForm(false)} />
        </div>
      ) : (
        <>
          {/* Timeframe Tabs Selection */}
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/60 dark:border-slate-800/60 pb-3">
              <div>
                <h3 className="font-extrabold text-sm text-slate-400 uppercase tracking-wider">
                  Driver Performance & Summaries
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-1">
                  Automatic calculations based on submitted daily platform reports.
                </p>
              </div>

              {/* Tabs buttons */}
              <div className="inline-flex p-1 bg-slate-100 dark:bg-slate-800 rounded-xl space-x-1 self-start">
                {(['today', 'weekly', 'monthly'] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`px-3.5 py-1.5 rounded-lg text-xs font-bold capitalize transition-all ${
                      activeTab === tab
                        ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm'
                        : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>
            </div>

            {/* Warning Alert if Active tab is Today and no report submitted */}
            {activeTab === 'today' && !hasTodayReport && (
              <div className="p-5 glass-card border border-amber-500/25 rounded-2xl flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-start space-x-3">
                  <AlertCircle className="h-5 w-5 text-amber-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <h4 className="font-bold text-slate-800 dark:text-slate-200 text-sm">Please submit your report for today</h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-medium font-sans">
                      Your today's summaries are empty. Submit your daily rides and odometer readings to populate this.
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowAddForm(true)}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all"
                >
                  Create Report
                </button>
              </div>
            )}

            {/* Today status if has today report */}
            {activeTab === 'today' && hasTodayReport && todayReport && (
              <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-2xl flex items-center space-x-3">
                <CheckCircle className="h-5 w-5 text-green-500" />
                <div className="text-xs">
                  <span className="font-bold text-green-700 dark:text-green-400">Today's report is submitted successfully!</span>
                  <span className="text-slate-500 dark:text-slate-400 ml-1.5 font-medium font-sans">
                    Settlement: <strong className="text-slate-700 dark:text-slate-300">{todayReport.settlementStatus}</strong>
                  </span>
                </div>
              </div>
            )}

            {/* Performance Bento Grid: 8 Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard
                title="Gross Earnings"
                value={`₹${currentStats.earnings.toLocaleString()}`}
                icon={Coins}
                colorClass="text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30 dark:text-emerald-400"
                subtitle="Total revenue generated"
                index={0}
              />
              <StatCard
                title="My Commission"
                value={`₹${currentStats.commission.toLocaleString()}`}
                icon={Award}
                colorClass="text-blue-600 bg-blue-50 dark:bg-blue-950/30 dark:text-blue-400"
                subtitle="Your take-home share"
                index={1}
              />
              <StatCard
                title="Due to Owner"
                value={`₹${currentStats.ownerDue.toLocaleString()}`}
                icon={TrendingUp}
                colorClass="text-indigo-600 bg-indigo-50 dark:bg-indigo-950/30 dark:text-indigo-400"
                subtitle="Amount to settle with owner"
                index={2}
              />
              <StatCard
                title="Distance Traveled"
                value={`${currentStats.kilometers.toLocaleString()} KM`}
                icon={Compass}
                colorClass="text-amber-600 bg-amber-50 dark:bg-amber-950/30 dark:text-amber-400"
                subtitle="Odometer tracked distance"
                index={3}
              />
              <StatCard
                title="Total Rides"
                value={`${currentStats.rides} Rides`}
                icon={Car}
                colorClass="text-purple-600 bg-purple-50 dark:bg-purple-950/30 dark:text-purple-400"
                subtitle="Completed across all apps"
                index={4}
              />
              <StatCard
                title="Fuel Expenses"
                value={`₹${currentStats.fuelExpense.toLocaleString()}`}
                icon={AlertCircle}
                colorClass="text-red-600 bg-red-50 dark:bg-red-950/30 dark:text-red-400"
                subtitle="Recorded fuel costs"
                index={5}
              />
              <StatCard
                title="Avg Earnings / Ride"
                value={`₹${avgEarningsPerRide.toLocaleString()}`}
                icon={Percent}
                colorClass="text-pink-600 bg-pink-50 dark:bg-pink-950/30 dark:text-pink-400"
                subtitle="Gross revenue per trip"
                index={6}
              />
              <StatCard
                title="Avg Earnings / KM"
                value={`₹${avgEarningsPerKM.toLocaleString()}`}
                icon={Gauge}
                colorClass="text-teal-600 bg-teal-50 dark:bg-teal-950/30 dark:text-teal-400"
                subtitle="Efficiency indicator"
                index={7}
              />
            </div>
          </div>

          {/* Recent Reports List */}
          <div className="p-5 glass-card rounded-2xl shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center space-x-2">
                <FileText className="h-4 w-4 text-blue-500" />
                <span>My Recent Daily Reports (Last 5)</span>
              </h3>
              <button 
                onClick={() => onViewChange('reports')}
                className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center"
              >
                <span>View All History</span>
                <ChevronRight className="h-3.5 w-3.5 ml-0.5" />
              </button>
            </div>

            {recentReports.length === 0 ? (
              <div className="text-center py-10">
                <HelpCircle className="h-10 w-10 text-slate-300 dark:text-slate-700 mx-auto mb-2" />
                <p className="text-xs text-slate-400 italic">No reports submitted yet. Submit your first report to start tracking your earnings.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm border-collapse">
                  <thead>
                    <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-400 font-bold text-xs uppercase tracking-wider">
                      <th className="py-3 px-2">Work Date</th>
                      <th className="py-3 px-2">Total Rides</th>
                      <th className="py-3 px-2">Total Earnings</th>
                      <th className="py-3 px-2">My Share Keeps</th>
                      <th className="py-3 px-2">Status</th>
                      <th className="py-3 px-2 text-right">Details</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentReports.map((r) => (
                      <tr key={r.id} className="border-b border-slate-50 dark:border-slate-800/40 text-slate-700 dark:text-slate-300 hover:bg-slate-50/50 dark:hover:bg-slate-800/10 transition-colors">
                        <td className="py-3.5 px-2 font-semibold font-mono text-xs">{r.date}</td>
                        <td className="py-3.5 px-2 font-mono">{r.totalRides}</td>
                        <td className="py-3.5 px-2 font-mono font-medium">₹{r.totalEarnings.toLocaleString()}</td>
                        <td className="py-3.5 px-2 font-mono text-emerald-600 dark:text-emerald-400 font-semibold">₹{r.driverKeeps.toLocaleString()}</td>
                        <td className="py-3.5 px-2">
                          <span className={`inline-flex text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            r.settlementStatus === 'Paid' 
                              ? 'bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-400' 
                              : 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400'
                          }`}>
                            {r.settlementStatus}
                          </span>
                        </td>
                        <td className="py-3.5 px-2 text-right">
                          <button
                            onClick={() => setSelectedReport(r)}
                            className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg text-xs font-bold transition-all"
                          >
                            Details
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {/* Details Drilldown trigger modal */}
      {selectedReport && user && (
        <ReportDetailModal 
          report={selectedReport} 
          currentUser={user} 
          onClose={() => setSelectedReport(null)} 
          onStatusUpdated={() => {
            setSelectedReport(null);
            fetchDriverDashboard();
          }}
        />
      )}

    </div>
  );
}
