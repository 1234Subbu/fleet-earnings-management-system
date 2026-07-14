import React, { useEffect, useState } from 'react';
import { useAuth } from './AuthContext';
import { api } from '../lib/api';
import { DailyReport, User, Vehicle } from '../types';
import ReportDetailModal from './ReportDetailModal';
import { 
  FileText, 
  Filter, 
  Download, 
  RefreshCw, 
  Search, 
  Calendar, 
  Car, 
  User as UserIcon, 
  Coins,
  CheckCircle,
  AlertCircle,
  X,
  FileSpreadsheet,
  Printer
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function ReportsView() {
  const { user } = useAuth();
  const [reports, setReports] = useState<DailyReport[]>([]);
  const [drivers, setDrivers] = useState<User[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters State
  const [selectedDriverId, setSelectedDriverId] = useState('');
  const [selectedVehicleId, setSelectedVehicleId] = useState('');
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [selectedFuelPaidBy, setSelectedFuelPaidBy] = useState('');
  const [selectedMonth, setSelectedMonth] = useState('');
  const [selectedYear, setSelectedYear] = useState('');
  const [selectedPlatform, setSelectedPlatform] = useState('');

  // Drilldown Modal
  const [selectedReport, setSelectedReport] = useState<DailyReport | null>(null);

  const isOwner = user?.role === 'Owner';

  const loadFilterParameters = async () => {
    try {
      if (isOwner) {
        const [driversData, vehiclesData] = await Promise.all([
          api.getDrivers(),
          api.getVehicles()
        ]);
        setDrivers(driversData.drivers || []);
        setVehicles(vehiclesData.vehicles || []);
      } else {
        const vehiclesData = await api.getVehicles();
        setVehicles(vehiclesData.vehicles || []);
      }
    } catch (err: any) {
      console.error('Failed to load filter metadata:', err);
    }
  };

  const fetchReports = async () => {
    setLoading(true);
    try {
      const filters: any = {
        driverId: selectedDriverId,
        vehicleId: selectedVehicleId,
        date: selectedDate,
        settlementStatus: selectedStatus,
        fuelPaidBy: selectedFuelPaidBy,
        month: selectedMonth,
        year: selectedYear,
      };

      const res = await api.getReports(filters);
      let list = res.reports || [];

      // Manual Platform filter if chosen
      if (selectedPlatform) {
        if (selectedPlatform === 'Ola') {
          list = list.filter((r: DailyReport) => r.olaEarnings > 0);
        } else if (selectedPlatform === 'Uber') {
          list = list.filter((r: DailyReport) => r.uberEarnings > 0);
        } else if (selectedPlatform === 'Rapido') {
          list = list.filter((r: DailyReport) => r.rapidoEarnings > 0);
        } else if (selectedPlatform === 'Other') {
          list = list.filter((r: DailyReport) => r.otherEarnings > 0);
        }
      }

      setReports(list);
    } catch (err: any) {
      toast.error('Failed to query reports: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFilterParameters();
  }, [user]);

  useEffect(() => {
    fetchReports();
  }, [
    selectedDriverId, 
    selectedVehicleId, 
    selectedDate, 
    selectedStatus, 
    selectedFuelPaidBy, 
    selectedMonth, 
    selectedYear,
    selectedPlatform
  ]);

  const resetFilters = () => {
    setSelectedDriverId('');
    setSelectedVehicleId('');
    setSelectedDate('');
    setSelectedStatus('');
    setSelectedFuelPaidBy('');
    setSelectedMonth('');
    setSelectedYear('');
    setSelectedPlatform('');
    toast.success('Filters cleared');
  };

  // --- CUSTOM REPORT EXPORTERS (CSV, EXCEL, PRINT/PDF) ---

  const handleExportCSV = () => {
    if (reports.length === 0) {
      toast.error('No reports to export');
      return;
    }

    const headers = [
      'Report ID', 'Date', 'Driver Name', 'Vehicle Number', 
      'Ola Rides', 'Uber Rides', 'Rapido Rides', 'Other Rides', 'Total Rides',
      'Ola Earnings (INR)', 'Uber Earnings (INR)', 'Rapido Earnings (INR)', 'Other Earnings (INR)', 'Total Earnings (INR)',
      'Commission Percent', 'Commission Amount (INR)', 'Fuel Paid By', 'Fuel Type', 'Fuel Amount (INR)', 
      'Driver Keeps (INR)', 'Owner Due (INR)', 'Amount Collected (INR)', 'Pending Due (INR)', 'Settlement Status', 'Created At'
    ];

    const rows = reports.map(r => {
      const pendingAmt = r.pendingAmount !== undefined ? r.pendingAmount : (r.settlementStatus === 'Paid' ? 0 : r.ownerDue);
      const collectedAmt = r.amountCollected !== undefined ? r.amountCollected : (r.settlementStatus === 'Paid' ? r.ownerDue : 0);
      return [
        r.id, r.date, r.driverName, r.vehicleNumber,
        r.olaRides, r.uberRides, r.rapidoRides, r.otherRides, r.totalRides,
        r.olaEarnings, r.uberEarnings, r.rapidoEarnings, r.otherEarnings, r.totalEarnings,
        r.commissionPercent, r.commissionAmount, r.fuelPaidBy, r.fuelType, r.fuelAmount,
        r.driverKeeps, r.ownerDue, collectedAmt, pendingAmt, r.settlementStatus, r.createdAt
      ];
    });

    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(','), ...rows.map(e => e.map(val => `"${val}"`).join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `fleet_earnings_report_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('CSV spreadsheet exported successfully');
  };

  const handleExportExcel = () => {
    // Standard spreadsheet compatibility
    handleExportCSV();
  };

  const handlePrintPDF = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      
      {/* Title & Actions Row */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            {isOwner ? 'Fleet Reports Database' : 'My Historical Work Reports'}
          </h2>
          <p className="text-xs font-semibold text-slate-400 mt-1">
            Query, filter, and export performance metrics spreadsheets
          </p>
        </div>

        <div className="flex items-center space-x-2.5 self-start">
          <button
            onClick={fetchReports}
            className="p-2.5 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl transition-all"
            title="Refresh database"
          >
            <RefreshCw className="h-4.5 w-4.5" />
          </button>

          {isOwner && (
            <>
              <button
                onClick={handleExportCSV}
                className="px-3.5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 shadow-sm shadow-emerald-500/10"
              >
                <FileSpreadsheet className="h-4.5 w-4.5" />
                <span className="hidden sm:inline">Export Excel/CSV</span>
              </button>

              <button
                onClick={handlePrintPDF}
                className="px-3.5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 shadow-sm shadow-blue-500/10"
              >
                <Printer className="h-4.5 w-4.5" />
                <span className="hidden sm:inline">Print / PDF</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Filter Bento Controls */}
      <div className="p-5 glass-card rounded-2xl shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
          <h3 className="font-bold text-xs text-slate-400 uppercase tracking-wider flex items-center space-x-1.5">
            <Filter className="h-4 w-4 text-slate-400" />
            <span>Search & Filter Parameters</span>
          </h3>
          <button 
            onClick={resetFilters}
            className="text-xs font-bold text-red-500 hover:underline flex items-center space-x-1"
          >
            <X className="h-3 w-3" />
            <span>Clear Filters</span>
          </button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {/* Driver Filter */}
          {isOwner && (
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1 flex items-center">
                <UserIcon className="h-3 w-3 mr-1" /> Driver
              </label>
              <select
                value={selectedDriverId}
                onChange={(e) => setSelectedDriverId(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none text-slate-800 dark:text-slate-200"
              >
                <option value="">All Drivers</option>
                {drivers.map(d => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </div>
          )}

          {/* Vehicle Filter */}
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1 flex items-center">
              <Car className="h-3 w-3 mr-1" /> Vehicle
            </label>
            <select
              value={selectedVehicleId}
              onChange={(e) => setSelectedVehicleId(e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none text-slate-800 dark:text-slate-200"
            >
              <option value="">All Vehicles</option>
              {vehicles.map(v => (
                <option key={v.id} value={v.id}>{v.vehicleNumber}</option>
              ))}
            </select>
          </div>

          {/* Settlement Status */}
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1 flex items-center">
              <Coins className="h-3 w-3 mr-1" /> Settlement Status
            </label>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none text-slate-800 dark:text-slate-200"
            >
              <option value="">All Statuses</option>
              <option value="Pending">Pending</option>
              <option value="Paid">Paid</option>
            </select>
          </div>

          {/* Fuel Paid By */}
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">
              Fuel Paid By
            </label>
            <select
              value={selectedFuelPaidBy}
              onChange={(e) => setSelectedFuelPaidBy(e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none text-slate-800 dark:text-slate-200"
            >
              <option value="">Either</option>
              <option value="Driver">Driver</option>
              <option value="Owner">Owner</option>
            </select>
          </div>

          {/* Platform Filter */}
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">
              Ride Platform
            </label>
            <select
              value={selectedPlatform}
              onChange={(e) => setSelectedPlatform(e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none text-slate-800 dark:text-slate-200"
            >
              <option value="">Any Platforms</option>
              <option value="Ola">Ola Active</option>
              <option value="Uber">Uber Active</option>
              <option value="Rapido">Rapido Active</option>
              <option value="Other">Other Active</option>
            </select>
          </div>

          {/* Precise Date Filter */}
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1 flex items-center">
              <Calendar className="h-3 w-3 mr-1" /> Precise Date
            </label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-full px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none text-slate-800 dark:text-slate-200 font-mono"
            />
          </div>

          {/* Month Filter */}
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">
              Month of Work
            </label>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none text-slate-800 dark:text-slate-200"
            >
              <option value="">All Months</option>
              {Array.from({ length: 12 }, (_, i) => {
                const mNum = i + 1;
                const mName = new Date(2026, i, 1).toLocaleString('en-US', { month: 'long' });
                return <option key={mNum} value={mNum}>{mName}</option>;
              })}
            </select>
          </div>

          {/* Year Filter */}
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">
              Year of Work
            </label>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none text-slate-800 dark:text-slate-200"
            >
              <option value="">All Years</option>
              <option value="2026">2026</option>
              <option value="2027">2027</option>
            </select>
          </div>
        </div>
      </div>

      {/* Reports Data Grid */}
      <div id="print-area" className="p-5 glass-card rounded-2xl shadow-sm space-y-4">
        
        {/* Print Header (Visible only when printing) */}
        <div className="hidden print:block mb-6 border-b pb-4">
          <h1 className="text-2xl font-bold">Balaji Travels - Earnings Summary</h1>
          <p className="text-sm text-slate-500">Report generated on {new Date().toLocaleDateString()}</p>
        </div>

        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
          <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center space-x-2">
            <FileText className="h-4 w-4 text-blue-500" />
            <span>Matching Daily Reports ({reports.length})</span>
          </h3>
          <span className="text-xs font-bold text-slate-400">
            Total Matched Earnings: ₹{reports.reduce((sum, r) => sum + r.totalEarnings, 0).toLocaleString()}
          </span>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-16 space-y-3">
            <div className="h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-xs font-bold text-slate-400">Loading spreadsheet data...</p>
          </div>
        ) : reports.length === 0 ? (
          <div className="text-center py-20 text-slate-400">
            <Search className="h-12 w-12 mx-auto text-slate-300 dark:text-slate-700 mb-3" />
            <p className="text-sm font-semibold">No records match the active filter criteria.</p>
            <p className="text-xs mt-1">Try resetting selected filters above to view driver records.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-400 font-bold uppercase tracking-wider">
                  <th className="py-3 px-2">Work Date</th>
                  {isOwner && <th className="py-3 px-2">Driver</th>}
                  <th className="py-3 px-2">Vehicle</th>
                  <th className="py-3 px-2 text-center">Rides</th>
                  <th className="py-3 px-2">Total Earnings</th>
                  <th className="py-3 px-2">Fuel Cost</th>
                  <th className="py-3 px-2">Driver Keeps</th>
                  <th className="py-3 px-2">Pending Due</th>
                  <th className="py-3 px-2">Status</th>
                  <th className="py-3 px-2 text-right print:hidden">Actions</th>
                </tr>
              </thead>
              <tbody>
                {reports.map((r) => {
                  const pendingAmt = r.pendingAmount !== undefined ? r.pendingAmount : (r.settlementStatus === 'Paid' ? 0 : r.ownerDue);
                  const collectedAmt = r.amountCollected !== undefined ? r.amountCollected : (r.settlementStatus === 'Paid' ? r.ownerDue : 0);
                  return (
                    <tr key={r.id} className="border-b border-slate-50 dark:border-slate-800/30 text-slate-700 dark:text-slate-300 hover:bg-slate-50/50 dark:hover:bg-slate-800/10 transition-colors">
                      <td className="py-3.5 px-2 font-mono font-semibold">{r.date}</td>
                      {isOwner && <td className="py-3.5 px-2 font-semibold text-slate-900 dark:text-white">{r.driverName}</td>}
                      <td className="py-3.5 px-2 font-medium font-mono">{r.vehicleNumber}</td>
                      <td className="py-3.5 px-2 text-center font-mono font-semibold">{r.totalRides}</td>
                      <td className="py-3.5 px-2 font-mono font-bold">₹{r.totalEarnings.toLocaleString()}</td>
                      <td className="py-3.5 px-2 font-mono font-medium text-red-500">₹{r.fuelAmount.toLocaleString()}</td>
                      <td className="py-3.5 px-2 font-mono text-indigo-500 font-semibold">₹{r.driverKeeps.toLocaleString()}</td>
                      <td className="py-3.5 px-2 font-mono text-emerald-600 dark:text-emerald-400 font-extrabold">
                        <div>₹{pendingAmt.toLocaleString()}</div>
                        {collectedAmt > 0 && r.settlementStatus === 'Pending' && (
                          <div className="text-[10px] font-bold text-slate-400 dark:text-slate-500">
                            Paid: ₹{collectedAmt.toLocaleString()}
                          </div>
                        )}
                      </td>
                    <td className="py-3.5 px-2">
                      <span className={`inline-flex text-[9px] font-bold px-2 py-0.5 rounded-full ${
                        r.settlementStatus === 'Paid' 
                          ? 'bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-400' 
                          : 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400'
                      }`}>
                        {r.settlementStatus}
                      </span>
                    </td>
                    <td className="py-3.5 px-2 text-right print:hidden">
                      <button
                        onClick={() => setSelectedReport(r)}
                        className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg text-xs font-semibold transition-all shadow-sm"
                      >
                        Inspect
                      </button>
                    </td>
                  </tr>
                ); })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Drilldown details modal */}
      {selectedReport && user && (
        <ReportDetailModal 
          report={selectedReport} 
          currentUser={user} 
          onClose={() => setSelectedReport(null)} 
          onStatusUpdated={() => {
            setSelectedReport(null);
            fetchReports();
          }}
        />
      )}

      {/* Custom Global CSS Print Layout styles */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #print-area, #print-area * {
            visibility: visible;
          }
          #print-area {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            border: none !important;
            box-shadow: none !important;
            padding: 0 !important;
          }
          .print\\:hidden {
            display: none !important;
          }
        }
      `}</style>

    </div>
  );
}
