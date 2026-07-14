import React, { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { CommissionSettings } from '../types';
import { Settings, Percent, Calculator, Coins, Save, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';

export default function CommissionSettingsView() {
  const [settings, setSettings] = useState<CommissionSettings>({ threshold: 4000, belowThreshold: 20, aboveThreshold: 30 });
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Form states
  const [threshold, setThreshold] = useState('4000');
  const [belowThreshold, setBelowThreshold] = useState('20');
  const [aboveThreshold, setAboveThreshold] = useState('30');

  // Simulator State
  const [simulatedEarnings, setSimulatedEarnings] = useState(5000);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const res = await api.getSettings();
      if (res.settings) {
        setSettings(res.settings);
        setThreshold(String(res.settings.threshold));
        setBelowThreshold(String(res.settings.belowThreshold));
        setAboveThreshold(String(res.settings.aboveThreshold));
      }
    } catch (err: any) {
      toast.error('Failed to load commission settings: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!threshold || !belowThreshold || !aboveThreshold) {
      toast.error('Please enter valid numeric parameters for all fields');
      return;
    }

    setSubmitting(true);
    try {
      const res = await api.updateSettings({
        threshold: Number(threshold),
        belowThreshold: Number(belowThreshold),
        aboveThreshold: Number(aboveThreshold)
      });
      setSettings(res.settings);
      toast.success(res.message || 'Commission settings saved and applied system-wide');
    } catch (err: any) {
      toast.error(err.message || 'Failed to update rules');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-16 space-y-3 glass-card rounded-2xl">
        <div className="h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-xs font-bold text-slate-400">Loading commission rules...</p>
      </div>
    );
  }

  // Simulator math
  const simEarnings = simulatedEarnings;
  const activeRate = simEarnings >= settings.threshold ? settings.aboveThreshold : settings.belowThreshold;
  const simCommission = Math.round((simEarnings * activeRate) / 100);
  const simOwnerDue = simEarnings - simCommission;

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      
      {/* Header */}
      <div>
        <h2 className="text-xl font-extrabold tracking-tight text-slate-900 dark:text-white">
          System Commission Settings
        </h2>
        <p className="text-xs font-semibold text-slate-400 mt-1">
          Configure default thresholds and rate divisions for driver earnings calculations
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Settings Form Card */}
        <div className="p-5 glass-card rounded-2xl shadow-sm space-y-4">
          <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center space-x-2 border-b border-slate-100 dark:border-slate-800 pb-3">
            <Settings className="h-4 w-4 text-blue-500" />
            <span>Operational Commission Rules</span>
          </h3>

          <form onSubmit={handleSaveSettings} className="space-y-4">
            
            {/* Threshold level */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                Earnings Tier Threshold (₹) <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-xs font-bold text-slate-400">₹</span>
                <input
                  type="number"
                  required
                  min="0"
                  value={threshold}
                  onChange={(e) => setThreshold(e.target.value)}
                  placeholder="e.g. 4000"
                  className="w-full pl-6 pr-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none text-slate-900 dark:text-white font-mono"
                />
              </div>
              <p className="text-[10px] text-slate-400 mt-1 font-medium">
                Earnings equal or above this sum receive the "Above Threshold" rate.
              </p>
            </div>

            {/* Split rates */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5 flex items-center">
                  <Percent className="h-3.5 w-3.5 mr-1 text-slate-400" />
                  <span>Below Tier %</span>
                </label>
                <input
                  type="number"
                  required
                  min="0"
                  max="100"
                  value={belowThreshold}
                  onChange={(e) => setBelowThreshold(e.target.value)}
                  placeholder="20"
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none text-slate-900 dark:text-white font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5 flex items-center">
                  <Percent className="h-3.5 w-3.5 mr-1 text-blue-500" />
                  <span>Above Tier %</span>
                </label>
                <input
                  type="number"
                  required
                  min="0"
                  max="100"
                  value={aboveThreshold}
                  onChange={(e) => setAboveThreshold(e.target.value)}
                  placeholder="30"
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none text-slate-900 dark:text-white font-mono"
                />
              </div>
            </div>

            <div className="pt-4 flex items-center justify-between border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={fetchSettings}
                className="p-2 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl text-slate-500 transition-all"
                title="Discard edits"
              >
                <RefreshCw className="h-4.5 w-4.5" />
              </button>

              <button
                type="submit"
                disabled={submitting}
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-blue-500/20 flex items-center space-x-1.5 disabled:opacity-50"
              >
                <Save className="h-4 w-4" />
                <span>{submitting ? 'Applying...' : 'Save Settings'}</span>
              </button>
            </div>

          </form>
        </div>

        {/* Visual split Simulator card */}
        <div className="p-5 glass-card rounded-2xl shadow-xl space-y-4 flex flex-col justify-between">
          <div className="space-y-4">
            <h3 className="font-bold text-sm text-slate-800 dark:text-white flex items-center space-x-2 border-b border-white/20 dark:border-white/5 pb-3">
              <Calculator className="h-4 w-4 text-emerald-500 dark:text-emerald-400" />
              <span>Earnings Payout Simulator</span>
            </h3>

            {/* Slider */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500 dark:text-slate-400 font-semibold">Simulated Platform Earnings</span>
                <span className="font-mono text-base font-bold text-emerald-600 dark:text-emerald-400">₹{simEarnings.toLocaleString()}</span>
              </div>
              <input
                type="range"
                min="1000"
                max="10000"
                step="100"
                value={simulatedEarnings}
                onChange={(e) => setSimulatedEarnings(parseInt(e.target.value))}
                className="w-full h-2 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
              />
              <div className="flex justify-between text-[10px] text-slate-400 dark:text-slate-500 font-bold font-mono">
                <span>₹1,000</span>
                <span>₹4,000</span>
                <span>₹7,000</span>
                <span>₹10,000</span>
              </div>
            </div>

            <hr className="border-white/20 dark:border-white/5" />

            {/* Simulated split outputs */}
            <div className="grid grid-cols-2 gap-4 text-sm bg-white/25 dark:bg-slate-950/40 p-4 rounded-xl border border-white/30 dark:border-white/5">
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Applied Rate Tier</span>
                <p className="text-sm font-bold text-slate-800 dark:text-white flex items-center space-x-1">
                  <span className="px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-900/80 text-blue-700 dark:text-blue-300 font-mono font-bold text-xs">{activeRate}%</span>
                  <span>{simEarnings >= settings.threshold ? 'Above threshold' : 'Below threshold'}</span>
                </p>
              </div>

              <div className="space-y-1">
                <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Driver Payout</span>
                <p className="font-mono text-base font-extrabold text-blue-600 dark:text-blue-400">₹{simCommission.toLocaleString()}</p>
              </div>

              <div className="space-y-1 col-span-2 pt-2 border-t border-white/20 dark:border-white/5">
                <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-widest">Owner Receives Due</span>
                <p className="font-mono text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-0.5">₹{simOwnerDue.toLocaleString()}</p>
              </div>
            </div>
          </div>

          <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium leading-relaxed bg-white/25 dark:bg-slate-950/40 p-2.5 rounded-lg border border-white/30 dark:border-white/5">
            * Note: This simulator calculates splits exclusive of fuel cost offsets. Actual payouts depend on whether CNG/fuel cost was paid by driver or owner in daily reports.
          </p>

        </div>

      </div>

    </div>
  );
}
