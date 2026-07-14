import React, { useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { api } from '../lib/api';
import { Vehicle, CommissionSettings, ReportImage } from '../types';
import { 
  DollarSign, 
  Car, 
  Calendar, 
  TrendingUp, 
  Fuel, 
  Percent, 
  Calculator, 
  Upload, 
  X, 
  CheckCircle, 
  Image as ImageIcon,
  AlertCircle
} from 'lucide-react';
import toast from 'react-hot-toast';

interface AddReportFormProps {
  onSuccess: () => void;
  onCancel?: () => void;
}

export default function AddReportForm({ onSuccess, onCancel }: AddReportFormProps) {
  const { user } = useAuth();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [settings, setSettings] = useState<CommissionSettings>({ threshold: 4000, belowThreshold: 20, aboveThreshold: 30 });
  const [loadingConfig, setLoadingConfig] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Form State
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [selectedVehicleId, setSelectedVehicleId] = useState('');
  
  // Rides Counts
  const [olaRides, setOlaRides] = useState<number | ''>('');
  const [uberRides, setUberRides] = useState<number | ''>('');
  const [rapidoRides, setRapidoRides] = useState<number | ''>('');
  const [otherRides, setOtherRides] = useState<number | ''>('');

  // Earnings
  const [olaEarnings, setOlaEarnings] = useState<number | ''>('');
  const [uberEarnings, setUberEarnings] = useState<number | ''>('');
  const [rapidoEarnings, setRapidoEarnings] = useState<number | ''>('');
  const [otherEarnings, setOtherEarnings] = useState<number | ''>('');

  // Fuel Section
  const [fuelPaidBy, setFuelPaidBy] = useState<'Driver' | 'Owner'>('Driver');
  const [fuelType, setFuelType] = useState<'CNG' | 'Petrol' | 'Diesel'>('CNG');
  const [fuelAmount, setFuelAmount] = useState<number | ''>('');

  // Proof Images
  const [uploadedProofs, setUploadedProofs] = useState<ReportImage[]>([]);
  const [uploadingImage, setUploadingImage] = useState(false);

  // Kilometer tracking State
  const [startingKM, setStartingKM] = useState<number | ''>('');
  const [endingKM, setEndingKM] = useState<number | ''>('');

  useEffect(() => {
    async function loadFormConfigs() {
      try {
        const [vData, sData] = await Promise.all([
          api.getVehicles(),
          api.getSettings()
        ]);
        
        setVehicles(vData.vehicles || []);
        if (sData.settings) {
          setSettings(sData.settings);
        }

        // Auto-select vehicle if driver has one assigned
        if (user?.assignedVehicleId) {
          setSelectedVehicleId(user.assignedVehicleId);
        } else if (vData.vehicles && vData.vehicles.length > 0) {
          setSelectedVehicleId(vData.vehicles[0].id);
        }
      } catch (err: any) {
        toast.error('Failed to load vehicle parameters: ' + err.message);
      } finally {
        setLoadingConfig(false);
      }
    }
    loadFormConfigs();
  }, [user]);

  // Dynamic Calculations (Instantly updated on typing)
  const valOlaRides = Number(olaRides || 0);
  const valUberRides = Number(uberRides || 0);
  const valRapidoRides = Number(rapidoRides || 0);
  const valOtherRides = Number(otherRides || 0);
  const totalRides = valOlaRides + valUberRides + valRapidoRides + valOtherRides;

  const valOlaEarnings = Number(olaEarnings || 0);
  const valUberEarnings = Number(uberEarnings || 0);
  const valRapidoEarnings = Number(rapidoEarnings || 0);
  const valOtherEarnings = Number(otherEarnings || 0);
  const totalEarnings = valOlaEarnings + valUberEarnings + valRapidoEarnings + valOtherEarnings;

  // Commission Formula Applied Instantly
  const commissionPercent = totalEarnings >= settings.threshold ? settings.aboveThreshold : settings.belowThreshold;
  const commissionAmount = Math.round((totalEarnings * commissionPercent) / 100);

  // Business logic formulas based on fuel rules
  const valFuelAmount = Number(fuelAmount || 0);
  let ownerDue = 0;
  let driverKeeps = 0;

  if (fuelPaidBy === 'Driver') {
    ownerDue = totalEarnings - commissionAmount - valFuelAmount;
    driverKeeps = commissionAmount + valFuelAmount;
  } else {
    ownerDue = totalEarnings - commissionAmount;
    driverKeeps = commissionAmount;
  }

  // Kilometer dynamic calculations
  const valStartingKM = startingKM === '' ? 0 : Number(startingKM);
  const valEndingKM = endingKM === '' ? 0 : Number(endingKM);
  const totalDistance = (startingKM !== '' && endingKM !== '') ? Math.max(0, valEndingKM - valStartingKM) : 0;
  
  let kmError = '';
  if (startingKM !== '' && valStartingKM < 0) {
    kmError = 'Starting KM cannot be negative.';
  } else if (endingKM !== '' && valEndingKM < 0) {
    kmError = 'Ending KM cannot be negative.';
  } else if (startingKM !== '' && endingKM !== '' && valEndingKM < valStartingKM) {
    kmError = 'Ending KM must always be greater than or equal to Starting KM.';
  }

  // Handle supporting image selection & base64 encoding conversion
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>, nameLabel: string) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 8 * 1024 * 1024) {
      toast.error('File size exceeds the 8MB image limit.');
      return;
    }

    setUploadingImage(true);
    const reader = new FileReader();
    reader.onloadend = async () => {
      try {
        const base64Str = reader.result as string;
        // Upload to server upload api
        const res = await api.uploadImage(base64Str, file.name);
        
        setUploadedProofs(prev => [...prev, { name: nameLabel, url: res.url }]);
        toast.success(`${nameLabel} uploaded successfully.`);
      } catch (err: any) {
        toast.error('Upload failed: ' + err.message);
      } finally {
        setUploadingImage(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const removeProof = (index: number) => {
    setUploadedProofs(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVehicleId) {
      toast.error('Please select a vehicle');
      return;
    }

    if (startingKM === '' || endingKM === '') {
      toast.error('Odometer readings are required');
      return;
    }

    const startKM = Number(startingKM);
    const endKM = Number(endingKM);

    if (isNaN(startKM) || isNaN(endKM)) {
      toast.error('Odometer readings must be valid numbers');
      return;
    }

    if (startKM < 0 || endKM < 0) {
      toast.error('Odometer readings cannot be negative');
      return;
    }

    if (endKM < startKM) {
      toast.error('Ending KM must be greater than or equal to Starting KM');
      return;
    }

    setSubmitting(true);
    try {
      await api.submitReport({
        date,
        vehicleId: selectedVehicleId,
        olaRides: valOlaRides,
        uberRides: valUberRides,
        rapidoRides: valRapidoRides,
        otherRides: valOtherRides,
        olaEarnings: valOlaEarnings,
        uberEarnings: valUberEarnings,
        rapidoEarnings: valRapidoEarnings,
        otherEarnings: valOtherEarnings,
        fuelPaidBy,
        fuelType,
        fuelAmount: valFuelAmount,
        images: uploadedProofs,
        startingKM: startKM,
        endingKM: endKM
      });

      toast.success("Today's report has been submitted. The owner has been notified.");
      onSuccess();
    } catch (err: any) {
      toast.error(err.message || 'Submission failed');
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingConfig) {
    return (
      <div className="flex flex-col items-center justify-center p-12 space-y-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl">
        <div className="h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-sm font-semibold text-slate-400">Loading configurations...</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-4xl mx-auto">
      
      {/* Upper Grid (Date & Vehicle Selection) */}
      <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 rounded-2xl shadow-sm grid grid-cols-1 md:grid-cols-2 gap-5">
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5 flex items-center space-x-1.5">
            <Calendar className="h-4 w-4 text-slate-400" />
            <span>Reporting Work Date</span>
          </label>
          <input
            type="date"
            required
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all text-slate-900 dark:text-white font-mono"
          />
        </div>

        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5 flex items-center space-x-1.5">
            <Car className="h-4 w-4 text-slate-400" />
            <span>Vehicle Driven</span>
          </label>
          <select
            required
            value={selectedVehicleId}
            onChange={(e) => setSelectedVehicleId(e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all text-slate-900 dark:text-white"
          >
            <option value="">-- Choose vehicle --</option>
            {vehicles.map((v) => (
              <option key={v.id} value={v.id}>
                {v.vehicleNumber} ({v.vehicleName})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Main Grid: Ride Counts & Earnings side by side */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Ride platform counts */}
        <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 rounded-2xl shadow-sm space-y-4">
          <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center space-x-2 border-b border-slate-100 dark:border-slate-800 pb-3">
            <TrendingUp className="h-4 w-4 text-blue-500" />
            <span>Ride Platform Counts (Rides)</span>
          </h3>

          <div className="space-y-3.5">
            <div className="flex items-center justify-between gap-4">
              <span className="text-sm font-semibold text-orange-600 dark:text-orange-400 w-28">Ola Rides</span>
              <input
                type="number"
                min="0"
                value={olaRides}
                onChange={(e) => setOlaRides(e.target.value === '' ? '' : Math.max(0, parseInt(e.target.value)))}
                placeholder="0"
                className="w-full max-w-xs px-3 py-2 text-right rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none font-mono"
              />
            </div>

            <div className="flex items-center justify-between gap-4">
              <span className="text-sm font-semibold text-slate-700 dark:text-slate-200 w-28">Uber Rides</span>
              <input
                type="number"
                min="0"
                value={uberRides}
                onChange={(e) => setUberRides(e.target.value === '' ? '' : Math.max(0, parseInt(e.target.value)))}
                placeholder="0"
                className="w-full max-w-xs px-3 py-2 text-right rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none font-mono"
              />
            </div>

            <div className="flex items-center justify-between gap-4">
              <span className="text-sm font-semibold text-yellow-600 dark:text-yellow-400 w-28">Rapido Rides</span>
              <input
                type="number"
                min="0"
                value={rapidoRides}
                onChange={(e) => setRapidoRides(e.target.value === '' ? '' : Math.max(0, parseInt(e.target.value)))}
                placeholder="0"
                className="w-full max-w-xs px-3 py-2 text-right rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none font-mono"
              />
            </div>

            <div className="flex items-center justify-between gap-4">
              <span className="text-sm font-semibold text-purple-600 dark:text-purple-400 w-28">Other Rides</span>
              <input
                type="number"
                min="0"
                value={otherRides}
                onChange={(e) => setOtherRides(e.target.value === '' ? '' : Math.max(0, parseInt(e.target.value)))}
                placeholder="0"
                className="w-full max-w-xs px-3 py-2 text-right rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none font-mono"
              />
            </div>

            <hr className="border-slate-100 dark:border-slate-800" />
            
            <div className="flex items-center justify-between text-slate-900 dark:text-white font-bold pt-1.5">
              <span>Total Calculated Rides</span>
              <span className="font-mono text-base">{totalRides} rides</span>
            </div>
          </div>
        </div>

        {/* Platform Earnings Entry */}
        <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 rounded-2xl shadow-sm space-y-4">
          <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center space-x-2 border-b border-slate-100 dark:border-slate-800 pb-3">
            <DollarSign className="h-4 w-4 text-emerald-500" />
            <span>Platform Financial Earnings (₹)</span>
          </h3>

          <div className="space-y-3.5">
            <div className="flex items-center justify-between gap-4">
              <span className="text-sm font-semibold text-orange-600 dark:text-orange-400 w-28">Ola Earnings</span>
              <div className="relative w-full max-w-xs">
                <span className="absolute left-2.5 top-2 text-xs font-bold text-slate-400">₹</span>
                <input
                  type="number"
                  min="0"
                  value={olaEarnings}
                  onChange={(e) => setOlaEarnings(e.target.value === '' ? '' : Math.max(0, parseInt(e.target.value)))}
                  placeholder="0"
                  className="w-full pl-6 pr-3 py-2 text-right rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none font-mono"
                />
              </div>
            </div>

            <div className="flex items-center justify-between gap-4">
              <span className="text-sm font-semibold text-slate-700 dark:text-slate-200 w-28">Uber Earnings</span>
              <div className="relative w-full max-w-xs">
                <span className="absolute left-2.5 top-2 text-xs font-bold text-slate-400">₹</span>
                <input
                  type="number"
                  min="0"
                  value={uberEarnings}
                  onChange={(e) => setUberEarnings(e.target.value === '' ? '' : Math.max(0, parseInt(e.target.value)))}
                  placeholder="0"
                  className="w-full pl-6 pr-3 py-2 text-right rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none font-mono"
                />
              </div>
            </div>

            <div className="flex items-center justify-between gap-4">
              <span className="text-sm font-semibold text-yellow-600 dark:text-yellow-400 w-28">Rapido Earnings</span>
              <div className="relative w-full max-w-xs">
                <span className="absolute left-2.5 top-2 text-xs font-bold text-slate-400">₹</span>
                <input
                  type="number"
                  min="0"
                  value={rapidoEarnings}
                  onChange={(e) => setRapidoEarnings(e.target.value === '' ? '' : Math.max(0, parseInt(e.target.value)))}
                  placeholder="0"
                  className="w-full pl-6 pr-3 py-2 text-right rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none font-mono"
                />
              </div>
            </div>

            <div className="flex items-center justify-between gap-4">
              <span className="text-sm font-semibold text-purple-600 dark:text-purple-400 w-28">Other Earnings</span>
              <div className="relative w-full max-w-xs">
                <span className="absolute left-2.5 top-2 text-xs font-bold text-slate-400">₹</span>
                <input
                  type="number"
                  min="0"
                  value={otherEarnings}
                  onChange={(e) => setOtherEarnings(e.target.value === '' ? '' : Math.max(0, parseInt(e.target.value)))}
                  placeholder="0"
                  className="w-full pl-6 pr-3 py-2 text-right rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none font-mono"
                />
              </div>
            </div>

            <hr className="border-slate-100 dark:border-slate-800" />
            
            <div className="flex items-center justify-between text-slate-900 dark:text-white font-bold pt-1.5">
              <span>Total Earnings Sum</span>
              <span className="font-mono text-base text-emerald-600 dark:text-emerald-400">₹{totalEarnings.toLocaleString()}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Fuel Expenses Grid */}
      <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 rounded-2xl shadow-sm space-y-4">
        <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center space-x-2 border-b border-slate-100 dark:border-slate-800 pb-3">
          <Fuel className="h-4 w-4 text-amber-500" />
          <span>Fuel Expenses & Fuel Management</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
              Fuel Paid By
            </label>
            <div className="flex items-center space-x-4 h-[42px]">
              <label className="inline-flex items-center text-sm font-semibold text-slate-700 dark:text-slate-300 cursor-pointer">
                <input
                  type="radio"
                  name="fuelPaidBy"
                  value="Driver"
                  checked={fuelPaidBy === 'Driver'}
                  onChange={() => setFuelPaidBy('Driver')}
                  className="mr-2 text-blue-600"
                />
                <span>Driver</span>
              </label>
              <label className="inline-flex items-center text-sm font-semibold text-slate-700 dark:text-slate-300 cursor-pointer">
                <input
                  type="radio"
                  name="fuelPaidBy"
                  value="Owner"
                  checked={fuelPaidBy === 'Owner'}
                  onChange={() => setFuelPaidBy('Owner')}
                  className="mr-2 text-blue-600"
                />
                <span>Owner</span>
              </label>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
              Fuel Source Type
            </label>
            <select
              value={fuelType}
              onChange={(e) => setFuelType(e.target.value as any)}
              className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none text-slate-900 dark:text-white"
            >
              <option value="CNG">CNG</option>
              <option value="Petrol">Petrol</option>
              <option value="Diesel">Diesel</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
              Fuel Cost (₹)
            </label>
            <div className="relative">
              <span className="absolute left-2.5 top-2.5 text-xs font-bold text-slate-400">₹</span>
              <input
                type="number"
                min="0"
                value={fuelAmount}
                onChange={(e) => setFuelAmount(e.target.value === '' ? '' : Math.max(0, parseInt(e.target.value)))}
                placeholder="0"
                className="w-full pl-6 pr-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none text-slate-900 dark:text-white font-mono"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Kilometer Reading Section */}
      <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 rounded-2xl shadow-sm space-y-4 font-sans">
        <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center space-x-2 border-b border-slate-100 dark:border-slate-800 pb-3">
          <TrendingUp className="h-4 w-4 text-indigo-500" />
          <span>Kilometer Reading</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
              Starting Odometer Reading (KM) <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              required
              min="0"
              value={startingKM}
              onChange={(e) => setStartingKM(e.target.value === '' ? '' : Math.max(0, parseInt(e.target.value)))}
              placeholder="e.g. 45210"
              className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none text-slate-900 dark:text-white font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
              Ending Odometer Reading (KM) <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              required
              min="0"
              value={endingKM}
              onChange={(e) => setEndingKM(e.target.value === '' ? '' : Math.max(0, parseInt(e.target.value)))}
              placeholder="e.g. 45385"
              className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none text-slate-900 dark:text-white font-mono"
            />
          </div>

          <div className="flex flex-col justify-end">
            <div className="p-3 bg-indigo-50 dark:bg-indigo-950/30 rounded-xl border border-indigo-100 dark:border-indigo-900/30">
              <span className="text-[10px] font-bold text-indigo-400 dark:text-indigo-300 uppercase block">Total Distance Traveled</span>
              <span className="text-lg font-mono font-black text-indigo-700 dark:text-indigo-400 mt-1 block">
                {startingKM !== '' && endingKM !== '' && Number(endingKM) >= Number(startingKM) ? `${Number(endingKM) - Number(startingKM)} KM` : '—'}
              </span>
            </div>
          </div>
        </div>

        {/* Display validation warning instantly */}
        {kmError && (
          <div className="flex items-center space-x-2 text-xs font-semibold text-red-500 bg-red-50 dark:bg-red-950/20 p-2.5 rounded-xl border border-red-100 dark:border-red-900/30 mt-2">
            <AlertCircle className="h-4 w-4 text-red-500 flex-shrink-0" />
            <span>{kmError}</span>
          </div>
        )}
      </div>

      {/* Calculations Breakdown Dashboard Box */}
      <div className="p-6 bg-slate-900 text-white rounded-2xl shadow-xl space-y-4 relative overflow-hidden border border-slate-800">
        <div className="absolute top-0 right-0 p-8 opacity-[0.03] pointer-events-none">
          <Calculator className="h-44 w-44" />
        </div>

        <h3 className="font-bold text-sm text-slate-300 flex items-center space-x-2 border-b border-slate-800 pb-3">
          <Calculator className="h-4 w-4 text-blue-400" />
          <span>Real-time Financial Output Calculation</span>
        </h3>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 text-sm">
          <div className="space-y-1">
            <span className="text-xs text-slate-400 font-medium">Platform Earnings</span>
            <p className="font-mono text-lg font-bold text-white">₹{totalEarnings.toLocaleString()}</p>
          </div>

          <div className="space-y-1">
            <span className="text-xs text-slate-400 font-medium flex items-center space-x-1">
              <span>Commission</span>
              <span className="px-1.5 py-0.5 rounded bg-blue-900/60 text-blue-300 text-[9px] font-bold">{commissionPercent}%</span>
            </span>
            <p className="font-mono text-lg font-bold text-white">₹{commissionAmount.toLocaleString()}</p>
          </div>

          <div className="space-y-1">
            <span className="text-xs text-slate-400 font-medium">Driver Keeps</span>
            <p className="font-mono text-lg font-bold text-indigo-300">₹{driverKeeps.toLocaleString()}</p>
          </div>

          <div className="space-y-1 bg-blue-950/40 p-2.5 rounded-xl border border-blue-900/30">
            <span className="text-xs text-blue-300 font-semibold uppercase tracking-wider">Owner Due</span>
            <p className="font-mono text-xl font-black text-emerald-400">₹{ownerDue.toLocaleString()}</p>
          </div>
        </div>

        {/* Business Rule description helper */}
        <div className="text-[10px] text-slate-400 font-medium flex items-center space-x-1 bg-slate-950/50 p-2 rounded-lg">
          <Percent className="h-3.5 w-3.5 text-blue-400" />
          <span>
            Commission Settings: Tier threshold ₹{settings.threshold.toLocaleString()} • 
            {totalEarnings >= settings.threshold ? ` Current earnings >= ₹${settings.threshold}, applied ${settings.aboveThreshold}% tier.` : ` Current earnings < ₹${settings.threshold}, applied ${settings.belowThreshold}% tier.`}
          </span>
        </div>
      </div>

      {/* Multiple Image Proofs Selector */}
      <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 rounded-2xl shadow-sm space-y-4">
        <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center space-x-2 border-b border-slate-100 dark:border-slate-800 pb-3">
          <ImageIcon className="h-4 w-4 text-emerald-500" />
          <span>Supporting Screenshot Proofs</span>
        </h3>

        {/* Dynamic Selectors */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            'Ola Screenshot',
            'Uber Screenshot',
            'Rapido Screenshot',
            'Trip Summary Screenshot',
            'Fuel Bill',
            'Meter Reading',
            'Vehicle Photo'
          ].map((label) => {
            const isUploaded = uploadedProofs.some(p => p.name === label);
            return (
              <div 
                key={label}
                className={`relative border border-dashed rounded-xl p-3 flex flex-col items-center justify-center text-center cursor-pointer transition-all ${
                  isUploaded 
                    ? 'border-green-300 bg-green-50/20 dark:border-green-800 dark:bg-green-950/10' 
                    : 'border-slate-200 hover:border-blue-400 dark:border-slate-800 dark:hover:border-blue-800 bg-slate-50 dark:bg-slate-950/40'
                }`}
              >
                <input
                  type="file"
                  accept="image/*"
                  disabled={uploadingImage || isUploaded}
                  onChange={(e) => handleFileChange(e, label)}
                  className="absolute inset-0 opacity-0 cursor-pointer disabled:cursor-not-allowed"
                />
                
                {isUploaded ? (
                  <>
                    <CheckCircle className="h-5 w-5 text-green-500 mb-1" />
                    <span className="text-[10px] font-bold text-green-600 dark:text-green-400">{label}</span>
                    <span className="text-[9px] text-slate-400">Ready</span>
                  </>
                ) : (
                  <>
                    <Upload className="h-5 w-5 text-slate-400 mb-1 group-hover:text-blue-500" />
                    <span className="text-[10px] font-semibold text-slate-600 dark:text-slate-300">{label}</span>
                    <span className="text-[9px] text-slate-400">Click to attach</span>
                  </>
                )}
              </div>
            );
          })}
        </div>

        {/* Upload Previews */}
        {uploadedProofs.length > 0 && (
          <div className="pt-3 border-t border-slate-100 dark:border-slate-800">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Uploaded Previews ({uploadedProofs.length})</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3">
              {uploadedProofs.map((img, i) => (
                <div key={i} className="relative border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden group aspect-video bg-slate-50">
                  <img 
                    src={img.url} 
                    alt={img.name} 
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute bottom-0 left-0 right-0 bg-black/60 p-1">
                    <p className="text-[9px] font-bold text-white truncate text-center">{img.name}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeProof(i)}
                    className="absolute top-1 right-1 p-1 rounded-full bg-red-600 text-white hover:bg-red-700 shadow-sm transition-colors"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Submission Actions */}
      <div className="flex items-center justify-end space-x-3">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="px-5 py-3 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl text-xs font-bold transition-all"
          >
            Cancel
          </button>
        )}
        <button
          type="submit"
          disabled={submitting || uploadingImage}
          className="px-7 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-blue-500/25 disabled:opacity-50"
        >
          {submitting ? 'Saving report...' : uploadingImage ? 'Uploading proof...' : 'Submit Daily Report'}
        </button>
      </div>

    </form>
  );
}
