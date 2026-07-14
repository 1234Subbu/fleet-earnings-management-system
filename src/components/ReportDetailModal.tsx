import React, { useState } from 'react';
import { DailyReport, User } from '../types';
import { api } from '../lib/api';
import { 
  X, 
  Calendar, 
  Car, 
  CheckCircle2, 
  AlertCircle, 
  Image as ImageIcon, 
  Fuel, 
  User as UserIcon, 
  TrendingUp, 
  Percent, 
  Coins, 
  CornerDownRight, 
  ExternalLink 
} from 'lucide-react';
import toast from 'react-hot-toast';

interface ReportDetailModalProps {
  report: DailyReport;
  currentUser: User;
  onClose: () => void;
  onStatusUpdated: () => void;
}

export default function ReportDetailModal({ report, currentUser, onClose, onStatusUpdated }: ReportDetailModalProps) {
  const [submitting, setSubmitting] = useState(false);
  const [zoomedImage, setZoomedImage] = useState<string | null>(null);

  const isOwner = currentUser.role === 'Owner';

  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [paymentMethod, setPaymentMethod] = useState<'Cash' | 'UPI' | 'Bank Transfer'>('Cash');
  const [paymentNotes, setPaymentNotes] = useState('');
  const [recordingPayment, setRecordingPayment] = useState(false);

  const ownerReceivable = report.ownerDue;
  const amountCollected = report.amountCollected !== undefined ? report.amountCollected : (report.settlementStatus === 'Paid' ? report.ownerDue : 0);
  const pendingAmount = report.pendingAmount !== undefined ? report.pendingAmount : (report.settlementStatus === 'Paid' ? 0 : report.ownerDue);
  const percentage = ownerReceivable > 0 ? Math.min(100, Math.round((amountCollected / ownerReceivable) * 100)) : 0;

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isOwner) return;

    const amt = Number(paymentAmount);
    if (isNaN(amt) || amt <= 0) {
      toast.error('Please enter a valid payment amount');
      return;
    }

    if (amountCollected + amt > ownerReceivable) {
      toast.error(`Payment amount ₹${amt} exceeds the remaining pending amount ₹${pendingAmount}`);
      return;
    }

    setRecordingPayment(true);
    try {
      const res = await api.recordSettlementPayment(report.id, {
        amount: amt,
        date: paymentDate,
        method: paymentMethod,
        notes: paymentNotes
      });
      toast.success(res.message || 'Payment recorded successfully!');
      setPaymentAmount('');
      setPaymentNotes('');
      onStatusUpdated();
    } catch (err: any) {
      toast.error(err.message || 'Failed to record payment');
    } finally {
      setRecordingPayment(false);
    }
  };

  const handleSettleToggle = async () => {
    if (!isOwner) return;
    const newStatus = report.settlementStatus === 'Pending' ? 'Paid' : 'Pending';
    
    setSubmitting(true);
    try {
      const res = await api.settleReport(report.id, newStatus);
      toast.success(res.message || 'Settlement status updated');
      onStatusUpdated();
    } catch (err: any) {
      toast.error(err.message || 'Failed to update settlement');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4 bg-slate-950/50 backdrop-blur-sm">
      <div className="relative bg-white dark:bg-slate-900 w-full max-w-4xl rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden max-h-[90vh] flex flex-col">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center space-x-3">
            <div className={`p-2 rounded-xl ${
              report.settlementStatus === 'Paid' 
                ? 'bg-green-50 text-green-600 dark:bg-green-950/40 dark:text-green-400' 
                : 'bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400'
            }`}>
              {report.settlementStatus === 'Paid' ? <CheckCircle2 className="h-5 w-5" /> : <AlertCircle className="h-5 w-5" />}
            </div>
            <div>
              <h2 className="font-bold text-lg text-slate-900 dark:text-white">
                Daily Report Detail
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">
                Report ID: {report.id} • Submitted {new Date(report.createdAt).toLocaleTimeString()}
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          
          {/* Quick Info Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/30 border border-slate-100 dark:border-slate-800/50 flex items-center space-x-3">
              <UserIcon className="h-5 w-5 text-blue-500" />
              <div>
                <p className="text-[10px] font-bold tracking-wider text-slate-400 uppercase">Driver Name</p>
                <p className="font-semibold text-slate-800 dark:text-slate-200 mt-0.5">{report.driverName}</p>
              </div>
            </div>
            
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/30 border border-slate-100 dark:border-slate-800/50 flex items-center space-x-3">
              <Calendar className="h-5 w-5 text-indigo-500" />
              <div>
                <p className="text-[10px] font-bold tracking-wider text-slate-400 uppercase">Date of Work</p>
                <p className="font-semibold text-slate-800 dark:text-slate-200 mt-0.5">{report.date}</p>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/30 border border-slate-100 dark:border-slate-800/50 flex items-center space-x-3">
              <Car className="h-5 w-5 text-emerald-500" />
              <div>
                <p className="text-[10px] font-bold tracking-wider text-slate-400 uppercase">Assigned Vehicle</p>
                <p className="font-semibold text-slate-800 dark:text-slate-200 mt-0.5">{report.vehicleNumber}</p>
              </div>
            </div>
          </div>

          {/* Kilometer Tracking Details */}
          <div className="p-4 rounded-xl bg-indigo-50/40 dark:bg-indigo-950/25 border border-indigo-100/50 dark:border-indigo-900/40 grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <p className="text-[10px] font-bold tracking-wider text-slate-400 uppercase">Starting Odometer</p>
              <p className="font-semibold text-sm font-mono text-slate-800 dark:text-slate-200 mt-0.5">
                {report.startingKM !== undefined && report.startingKM !== null ? `${report.startingKM.toLocaleString()} KM` : '—'}
              </p>
            </div>
            <div>
              <p className="text-[10px] font-bold tracking-wider text-slate-400 uppercase">Ending Odometer</p>
              <p className="font-semibold text-sm font-mono text-slate-800 dark:text-slate-200 mt-0.5">
                {report.endingKM !== undefined && report.endingKM !== null ? `${report.endingKM.toLocaleString()} KM` : '—'}
              </p>
            </div>
            <div>
              <p className="text-[10px] font-bold tracking-wider text-slate-400 uppercase">Distance Traveled</p>
              <p className="font-extrabold text-sm font-mono text-indigo-600 dark:text-indigo-400 mt-0.5">
                {report.startingKM !== undefined && report.endingKM !== undefined && report.startingKM !== null && report.endingKM !== null
                  ? `${(report.endingKM - report.startingKM).toLocaleString()} KM` 
                  : '—'}
              </p>
            </div>
          </div>

          {/* Breakdown Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Rides & Platform Earnings */}
            <div className="border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-4">
              <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center space-x-2 border-b border-slate-100 dark:border-slate-800 pb-3">
                <TrendingUp className="h-4 w-4 text-blue-500" />
                <span>Rides & Platform Earnings</span>
              </h3>
              
              <div className="space-y-2 text-sm">
                <div className="flex justify-between items-center text-slate-500 dark:text-slate-400 font-medium py-1">
                  <span>Platform</span>
                  <span>Rides</span>
                  <span className="w-24 text-right">Earnings</span>
                </div>
                
                <hr className="border-slate-100 dark:border-slate-800" />

                <div className="flex justify-between items-center py-1">
                  <span className="font-semibold text-orange-600 dark:text-orange-400">Ola</span>
                  <span className="font-mono">{report.olaRides}</span>
                  <span className="font-mono font-medium w-24 text-right">₹{report.olaEarnings.toLocaleString()}</span>
                </div>

                <div className="flex justify-between items-center py-1">
                  <span className="font-semibold text-black dark:text-white">Uber</span>
                  <span className="font-mono">{report.uberRides}</span>
                  <span className="font-mono font-medium w-24 text-right">₹{report.uberEarnings.toLocaleString()}</span>
                </div>

                <div className="flex justify-between items-center py-1">
                  <span className="font-semibold text-yellow-600 dark:text-yellow-400">Rapido</span>
                  <span className="font-mono">{report.rapidoRides}</span>
                  <span className="font-mono font-medium w-24 text-right">₹{report.rapidoEarnings.toLocaleString()}</span>
                </div>

                <div className="flex justify-between items-center py-1">
                  <span className="font-semibold text-purple-600 dark:text-purple-400">Other Services</span>
                  <span className="font-mono">{report.otherRides}</span>
                  <span className="font-mono font-medium w-24 text-right">₹{report.otherEarnings.toLocaleString()}</span>
                </div>

                <hr className="border-slate-100 dark:border-slate-800" />

                <div className="flex justify-between items-center font-bold text-slate-900 dark:text-white pt-2 text-base">
                  <span>Total Summarized</span>
                  <span className="font-mono">{report.totalRides} rides</span>
                  <span className="font-mono w-24 text-right">₹{report.totalEarnings.toLocaleString()}</span>
                </div>
              </div>
            </div>

            {/* Calculations & Commission Details */}
            <div className="border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-4">
              <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center space-x-2 border-b border-slate-100 dark:border-slate-800 pb-3">
                <Percent className="h-4 w-4 text-indigo-500" />
                <span>Calculations & Commission</span>
              </h3>
              
              <div className="space-y-3 text-sm">
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 dark:text-slate-400 font-medium">Total Platform Earnings</span>
                  <span className="font-mono font-bold text-slate-900 dark:text-white">₹{report.totalEarnings.toLocaleString()}</span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-slate-500 dark:text-slate-400 font-medium">Commission Rate applied</span>
                  <span className="font-mono font-semibold px-2 py-0.5 rounded-lg bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400 text-xs">
                    {report.commissionPercent}%
                  </span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-slate-500 dark:text-slate-400 font-medium">Calculated Commission</span>
                  <span className="font-mono font-semibold text-slate-900 dark:text-white">₹{report.commissionAmount.toLocaleString()}</span>
                </div>

                <hr className="border-slate-100 dark:border-slate-800" />

                <div className="flex justify-between items-center">
                  <span className="text-slate-500 dark:text-slate-400 font-medium flex items-center space-x-1">
                    <Fuel className="h-4 w-4 text-slate-400" />
                    <span>Fuel Expenses ({report.fuelType})</span>
                  </span>
                  <span className="font-mono font-semibold text-slate-900 dark:text-white">₹{report.fuelAmount.toLocaleString()}</span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-slate-500 dark:text-slate-400 font-medium">Fuel Paid By</span>
                  <span className="font-semibold text-xs px-2 py-0.5 rounded-lg bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                    {report.fuelPaidBy}
                  </span>
                </div>

                <hr className="border-slate-200 dark:border-slate-800" />

                {/* Final Net Settlements */}
                <div className="space-y-2 bg-slate-50 dark:bg-slate-800/30 p-3 rounded-xl border border-slate-100 dark:border-slate-800/50">
                  <div className="flex justify-between items-center text-xs text-slate-500 dark:text-slate-400">
                    <span className="flex items-center"><CornerDownRight className="h-3 w-3 mr-1" /> Driver Keeps</span>
                    <span className="font-mono font-semibold text-slate-800 dark:text-slate-200">₹{report.driverKeeps.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm font-bold text-slate-900 dark:text-white">
                    <span className="flex items-center"><Coins className="h-4 w-4 mr-1.5 text-emerald-500" /> Owner Collection Due</span>
                    <span className="font-mono text-emerald-600 dark:text-emerald-400">₹{report.ownerDue.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Advanced Settlement Section */}
          <div className="border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-6 bg-slate-50/40 dark:bg-slate-900/40">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-3">
              <h3 className="font-extrabold text-sm text-slate-900 dark:text-white flex items-center space-x-2">
                <Coins className="h-4.5 w-4.5 text-emerald-500" />
                <span>Settlement Tracking & Payment Ledger</span>
              </h3>
              <span className={`text-[10px] font-extrabold px-2.5 py-1 rounded-full ${
                pendingAmount === 0 
                  ? 'bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-400 border border-green-500/25' 
                  : 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 border border-amber-500/25'
              }`}>
                {pendingAmount === 0 ? 'Fully Paid / Settled' : 'Partially Settled / Pending'}
              </span>
            </div>

            {/* Progress and Numbers */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
              
              {/* Circular progress indicators */}
              <div className="md:col-span-4 flex flex-col items-center justify-center p-4 bg-white dark:bg-slate-950 border border-slate-200/50 dark:border-slate-800 rounded-xl space-y-2">
                <div className="relative w-24 h-24 flex items-center justify-center">
                  {/* SVG Circular indicator */}
                  <svg className="w-full h-full transform -rotate-90">
                    <circle cx="48" cy="48" r="40" stroke="currentColor" className="text-slate-100 dark:text-slate-800" strokeWidth="8" fill="transparent" />
                    <circle cx="48" cy="48" r="40" stroke="currentColor" className="text-emerald-500 transition-all duration-500" strokeWidth="8" strokeDasharray={`${2 * Math.PI * 40}`} strokeDashoffset={`${2 * Math.PI * 40 * (1 - percentage / 100)}`} strokeLinecap="round" fill="transparent" />
                  </svg>
                  <span className="absolute text-base font-extrabold text-slate-800 dark:text-slate-200 font-mono">{percentage}%</span>
                </div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Payment Progress</span>
              </div>

              {/* Big Stat Cards */}
              <div className="md:col-span-8 grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-3 bg-white dark:bg-slate-950 border border-slate-200/50 dark:border-slate-800 rounded-xl">
                  <span className="text-[9px] font-bold text-slate-400 uppercase">Owner Receivable</span>
                  <p className="text-sm font-extrabold text-slate-900 dark:text-white font-mono mt-0.5">₹{ownerReceivable.toLocaleString()}</p>
                </div>
                <div className="p-3 bg-white dark:bg-slate-950 border border-slate-200/50 dark:border-slate-800 rounded-xl">
                  <span className="text-[9px] font-bold text-emerald-500 uppercase">Amount Collected</span>
                  <p className="text-sm font-extrabold text-emerald-600 dark:text-emerald-400 font-mono mt-0.5">₹{amountCollected.toLocaleString()}</p>
                </div>
                <div className="p-3 bg-white dark:bg-slate-950 border border-slate-200/50 dark:border-slate-800 rounded-xl">
                  <span className="text-[9px] font-bold text-amber-500 uppercase">Pending Balance</span>
                  <p className="text-sm font-extrabold text-amber-600 dark:text-amber-400 font-mono mt-0.5">₹{pendingAmount.toLocaleString()}</p>
                </div>
              </div>
            </div>

            {/* Linear progress bar */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-[11px] font-bold">
                <span className="text-slate-400">Completion Status</span>
                <span className="text-slate-600 dark:text-slate-300 font-mono">₹{amountCollected.toLocaleString()} / ₹{ownerReceivable.toLocaleString()}</span>
              </div>
              <div className="w-full bg-slate-200 dark:bg-slate-800 rounded-full h-2.5 overflow-hidden">
                <div className="bg-emerald-500 h-full rounded-full transition-all duration-500" style={{ width: `${percentage}%` }}></div>
              </div>
            </div>

            {/* Settlement History List */}
            <div className="space-y-3">
              <h4 className="text-xs font-extrabold text-slate-400 uppercase tracking-wider">Payment Transaction Ledger</h4>
              {(!report.settlementHistory || report.settlementHistory.length === 0) ? (
                <div className="p-3 bg-white dark:bg-slate-950/40 border border-slate-200/40 dark:border-slate-800/60 rounded-xl text-center">
                  <p className="text-xs text-slate-400 italic">No payment transactions recorded for this report. Direct settlement updates only.</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                  {report.settlementHistory.map((pay, i) => (
                    <div key={pay.id || i} className="p-2.5 bg-white dark:bg-slate-950 border border-slate-200/50 dark:border-slate-800 rounded-xl flex items-center justify-between text-xs transition-colors hover:bg-slate-50/50 dark:hover:bg-slate-900/50">
                      <div className="flex items-center space-x-3">
                        <span className="font-bold text-slate-400 font-mono">#{i + 1}</span>
                        <div>
                          <p className="font-extrabold text-slate-800 dark:text-slate-200 font-mono">₹{pay.amount.toLocaleString()}</p>
                          <p className="text-[10px] text-slate-400 font-medium">{pay.date} • via <span className="font-semibold text-slate-600 dark:text-slate-300">{pay.method}</span></p>
                        </div>
                      </div>
                      {pay.notes && (
                        <span className="text-[10px] text-slate-500 dark:text-slate-400 italic max-w-xs truncate" title={pay.notes}>
                          "{pay.notes}"
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Owner Payment Entry Form */}
            {isOwner && pendingAmount > 0 && (
              <div className="p-4 bg-white dark:bg-slate-950 border border-indigo-500/10 dark:border-indigo-500/20 rounded-xl space-y-4">
                <h4 className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wide">Record New Settlement Payment</h4>
                <form onSubmit={handleRecordPayment} className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">Payment Amount (₹)</label>
                    <input
                      type="number"
                      required
                      min="1"
                      max={pendingAmount}
                      placeholder={`Max ₹${pendingAmount}`}
                      value={paymentAmount}
                      onChange={(e) => setPaymentAmount(e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none font-semibold text-slate-800 dark:text-slate-200"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">Payment Date</label>
                    <input
                      type="date"
                      required
                      value={paymentDate}
                      onChange={(e) => setPaymentDate(e.target.value)}
                      className="w-full px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none font-mono text-slate-800 dark:text-slate-200"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">Method</label>
                    <select
                      value={paymentMethod}
                      onChange={(e: any) => setPaymentMethod(e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none text-slate-800 dark:text-slate-200 font-semibold"
                    >
                      <option value="Cash">Cash</option>
                      <option value="UPI">UPI</option>
                      <option value="Bank Transfer">Bank Transfer</option>
                    </select>
                  </div>
                  <div>
                    <button
                      type="submit"
                      disabled={recordingPayment || Number(paymentAmount) <= 0 || Number(paymentAmount) > pendingAmount}
                      className="w-full py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-lg transition-all shadow-sm shadow-blue-500/10 disabled:opacity-50 animate-pulse-once"
                    >
                      {recordingPayment ? 'Saving...' : 'Save Payment'}
                    </button>
                  </div>
                  <div className="sm:col-span-4">
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">Notes (Optional)</label>
                    <input
                      type="text"
                      placeholder="Add payment notes here (e.g. UPI Transaction ID, cash handed over, etc.)"
                      value={paymentNotes}
                      onChange={(e) => setPaymentNotes(e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none text-slate-800 dark:text-slate-200"
                    />
                  </div>
                </form>
              </div>
            )}
          </div>

          {/* Supporting Screenshots & Proofs */}
          <div className="space-y-3">
            <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center space-x-2">
              <ImageIcon className="h-4 w-4 text-emerald-500" />
              <span>Supporting Proofs ({report.images.length})</span>
            </h3>
            
            {report.images.length === 0 ? (
              <p className="text-xs text-slate-400 font-medium italic p-4 bg-slate-50 dark:bg-slate-800/20 border border-slate-100 dark:border-slate-800 rounded-xl">
                No screenshot proofs or fuel bills were uploaded with this report.
              </p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {report.images.map((img, i) => (
                  <div 
                    key={i} 
                    className="relative group border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden aspect-video cursor-pointer bg-slate-100 dark:bg-slate-800 shadow-sm"
                    onClick={() => setZoomedImage(img.url)}
                  >
                    <img 
                      src={img.url} 
                      alt={img.name} 
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <span className="text-[10px] text-white bg-slate-900/80 px-2 py-1 rounded-md font-medium flex items-center space-x-1 shadow">
                        <span>Zoom</span>
                        <ExternalLink className="h-3 w-3" />
                      </span>
                    </div>
                    <div className="absolute bottom-0 left-0 right-0 bg-slate-950/60 p-1.5">
                      <p className="text-[10px] font-semibold text-white truncate text-center">{img.name}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer with Settlement Change */}
        <div className="px-6 py-4 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center space-x-2">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Settlement Status:</span>
            <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${
              report.settlementStatus === 'Paid' 
                ? 'bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-400' 
                : 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400'
            }`}>
              {report.settlementStatus}
            </span>
          </div>

          <div className="flex items-center justify-end space-x-3">
            {isOwner && (
              <button
                disabled={submitting}
                onClick={handleSettleToggle}
                className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all shadow-sm ${
                  report.settlementStatus === 'Paid'
                    ? 'bg-amber-600 hover:bg-amber-700 text-white shadow-amber-500/10'
                    : 'bg-green-600 hover:bg-green-700 text-white shadow-green-500/10'
                } disabled:opacity-50`}
              >
                {submitting ? 'Updating...' : report.settlementStatus === 'Paid' ? 'Mark as Pending' : 'Mark as Settle Paid'}
              </button>
            )}
            <button
              onClick={onClose}
              className="px-4 py-2 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold transition-all"
            >
              Close
            </button>
          </div>
        </div>
      </div>

      {/* Lightbox / Zoomed Image overlay */}
      {zoomedImage && (
        <div 
          className="fixed inset-0 z-55 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 cursor-zoom-out"
          onClick={() => setZoomedImage(null)}
        >
          <button 
            className="absolute top-4 right-4 p-2 rounded-full bg-slate-900 text-white hover:bg-slate-800 transition-colors"
            onClick={() => setZoomedImage(null)}
          >
            <X className="h-6 w-6" />
          </button>
          <img 
            src={zoomedImage} 
            alt="Zoomed proof" 
            className="max-w-full max-h-[90vh] object-contain rounded-xl shadow-2xl border border-slate-800"
            referrerPolicy="no-referrer"
          />
        </div>
      )}
    </div>
  );
}
