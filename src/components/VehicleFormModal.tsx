import React, { useState, useEffect } from 'react';
import { Vehicle, User } from '../types';
import { api } from '../lib/api';
import { X, Car, ShieldAlert } from 'lucide-react';
import toast from 'react-hot-toast';

interface VehicleFormModalProps {
  vehicle?: Vehicle | null; // Null if creating
  drivers: User[];
  onClose: () => void;
  onSaved: () => void;
}

export default function VehicleFormModal({ vehicle, drivers, onClose, onSaved }: VehicleFormModalProps) {
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [vehicleName, setVehicleName] = useState('');
  const [brand, setBrand] = useState('');
  const [model, setModel] = useState('');
  const [insuranceExpiry, setInsuranceExpiry] = useState('');
  const [assignedDriverId, setAssignedDriverId] = useState('');
  const [status, setStatus] = useState<'Active' | 'Maintenance' | 'Inactive'>('Active');
  
  const [submitting, setSubmitting] = useState(false);

  const isEdit = !!vehicle;

  useEffect(() => {
    if (vehicle) {
      setVehicleNumber(vehicle.vehicleNumber);
      setVehicleName(vehicle.vehicleName);
      setBrand(vehicle.brand);
      setModel(vehicle.model);
      setInsuranceExpiry(vehicle.insuranceExpiry);
      setAssignedDriverId(vehicle.assignedDriverId || '');
      setStatus(vehicle.status);
    } else {
      setVehicleNumber('');
      setVehicleName('');
      setBrand('');
      setModel('');
      setInsuranceExpiry('');
      setAssignedDriverId('');
      setStatus('Active');
    }
  }, [vehicle]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vehicleNumber || !vehicleName) {
      toast.error('Vehicle Number and Vehicle Name are required');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        vehicleNumber: vehicleNumber.toUpperCase().trim(),
        vehicleName,
        brand,
        model,
        insuranceExpiry,
        assignedDriverId: assignedDriverId || undefined,
        status,
      };

      if (isEdit && vehicle) {
        await api.updateVehicle(vehicle.id, payload);
        toast.success('Vehicle records updated successfully');
      } else {
        await api.createVehicle(payload);
        toast.success('New vehicle added to the fleet database');
      }
      onSaved();
    } catch (err: any) {
      toast.error(err.message || 'Failed to save vehicle');
    } finally {
      setSubmitting(false);
    }
  };

  // Filter drivers who don't have vehicles assigned, or are already assigned to this vehicle
  const availableDrivers = drivers.filter(d => 
    !d.assignedVehicleId || (vehicle && d.assignedVehicleId === vehicle.id)
  );

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4 bg-slate-950/50 backdrop-blur-sm">
      <div className="relative bg-white dark:bg-slate-900 w-full max-w-md rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden max-h-[90vh] flex flex-col">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400 rounded-xl">
              <Car className="h-5 w-5" />
            </div>
            <h2 className="font-bold text-lg text-slate-900 dark:text-white">
              {isEdit ? 'Update Vehicle Details' : 'Register New Vehicle'}
            </h2>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content Form */}
        <div className="flex-1 overflow-y-auto p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Vehicle Number Plate */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                License Plate Number <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={vehicleNumber}
                onChange={(e) => setVehicleNumber(e.target.value)}
                placeholder="e.g. KA-01-MJ-5566"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all text-slate-900 dark:text-white font-mono uppercase"
              />
            </div>

            {/* Vehicle Display Name */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                Vehicle Name / Tag <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={vehicleName}
                onChange={(e) => setVehicleName(e.target.value)}
                placeholder="e.g. Maruti Suzuki Dzire CNG"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all text-slate-900 dark:text-white"
              />
            </div>

            {/* Brand & Model */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                  Brand / Make
                </label>
                <input
                  type="text"
                  value={brand}
                  onChange={(e) => setBrand(e.target.value)}
                  placeholder="e.g. Maruti"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all text-slate-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                  Model Series
                </label>
                <input
                  type="text"
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  placeholder="e.g. Dzire CNG"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all text-slate-900 dark:text-white"
                />
              </div>
            </div>

            {/* Insurance Expiration Date */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                Insurance Expiry Date
              </label>
              <input
                type="date"
                value={insuranceExpiry}
                onChange={(e) => setInsuranceExpiry(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all text-slate-900 dark:text-white font-mono"
              />
            </div>

            {/* Assigned Driver */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                Assign Primary Driver
              </label>
              <select
                value={assignedDriverId}
                onChange={(e) => setAssignedDriverId(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all text-slate-900 dark:text-white"
              >
                <option value="">-- No driver assigned --</option>
                {availableDrivers.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name} ({d.username})
                  </option>
                ))}
              </select>
            </div>

            {/* Vehicle Maintenance Status */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                Operational Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as any)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all text-slate-900 dark:text-white"
              >
                <option value="Active">Active & Serving</option>
                <option value="Maintenance">In Maintenance</option>
                <option value="Inactive">Deactivated / Inactive</option>
              </select>
            </div>

            <div className="pt-4 flex items-center justify-end space-x-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl text-xs font-bold transition-all"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all disabled:opacity-50"
              >
                {submitting ? 'Registering...' : isEdit ? 'Save Changes' : 'Register Vehicle'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
