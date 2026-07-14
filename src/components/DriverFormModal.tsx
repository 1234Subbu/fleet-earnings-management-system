import React, { useState, useEffect } from 'react';
import { User, Vehicle } from '../types';
import { api } from '../lib/api';
import { X, UserCheck, Shield, Key, AlertTriangle, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';

interface DriverFormModalProps {
  driver?: User | null; // Null if creating
  vehicles: Vehicle[];
  onClose: () => void;
  onSaved: () => void;
}

export default function DriverFormModal({ driver, vehicles, onClose, onSaved }: DriverFormModalProps) {
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [status, setStatus] = useState<'Active' | 'Disabled'>('Active');
  const [assignedVehicleId, setAssignedVehicleId] = useState('');
  
  const [submitting, setSubmitting] = useState(false);
  const [isResetMode, setIsResetMode] = useState(false);
  const [resetPasswordVal, setResetPasswordVal] = useState('');

  const isEdit = !!driver;

  useEffect(() => {
    if (driver) {
      setName(driver.name);
      setUsername(driver.username);
      setStatus(driver.status);
      setAssignedVehicleId(driver.assignedVehicleId || '');
    } else {
      setName('');
      setUsername('');
      setPassword('');
      setStatus('Active');
      setAssignedVehicleId('');
    }
  }, [driver]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !username || (!isEdit && !password)) {
      toast.error('Please fill in all required fields');
      return;
    }

    setSubmitting(true);
    try {
      if (isEdit && driver) {
        await api.updateDriver(driver.id, {
          name,
          status,
          assignedVehicleId: assignedVehicleId || undefined
        });
        toast.success('Driver information updated successfully');
      } else {
        await api.createDriver({
          name,
          username,
          password,
          assignedVehicleId: assignedVehicleId || undefined
        });
        toast.success('New driver profile created successfully');
      }
      onSaved();
    } catch (err: any) {
      toast.error(err.message || 'Failed to save driver');
    } finally {
      setSubmitting(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetPasswordVal) {
      toast.error('Please enter a new password');
      return;
    }

    setSubmitting(true);
    try {
      if (driver) {
        await api.resetDriverPassword(driver.id, { password: resetPasswordVal });
        toast.success('Password updated successfully');
        setIsResetMode(false);
        setResetPasswordVal('');
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to reset password');
    } finally {
      setSubmitting(false);
    }
  };

  // Filter vehicles that are not assigned, or are assigned to the current driver
  const availableVehicles = vehicles.filter(v => 
    !v.assignedDriverId || (driver && v.assignedDriverId === driver.id)
  );

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4 bg-slate-950/50 backdrop-blur-sm">
      <div className="relative bg-white dark:bg-slate-900 w-full max-w-md rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden max-h-[90vh] flex flex-col">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400 rounded-xl">
              <UserCheck className="h-5 w-5" />
            </div>
            <h2 className="font-bold text-lg text-slate-900 dark:text-white">
              {isEdit ? 'Modify Driver Profile' : 'Add New Fleet Driver'}
            </h2>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tab Selection if editing (Profile vs Reset Password) */}
        {isEdit && (
          <div className="flex border-b border-slate-100 dark:border-slate-800 px-6 bg-slate-50/50 dark:bg-slate-900/30">
            <button
              onClick={() => setIsResetMode(false)}
              className={`py-3 text-xs font-bold uppercase tracking-wider border-b-2 px-3 transition-colors ${
                !isResetMode 
                  ? 'border-blue-600 text-blue-600 dark:text-blue-400' 
                  : 'border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
              }`}
            >
              Account Information
            </button>
            <button
              onClick={() => setIsResetMode(true)}
              className={`py-3 text-xs font-bold uppercase tracking-wider border-b-2 px-3 transition-colors ${
                isResetMode 
                  ? 'border-blue-600 text-blue-600 dark:text-blue-400' 
                  : 'border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
              }`}
            >
              Reset Security Password
            </button>
          </div>
        )}

        {/* Form */}
        <div className="flex-1 overflow-y-auto p-6">
          {!isResetMode ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Full Name */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                  Full Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Ramesh Singh"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all text-slate-900 dark:text-white"
                />
              </div>

              {/* Username */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                  Username (For Logins) <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  disabled={isEdit}
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="e.g. ramesh_singh"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all disabled:opacity-65 disabled:bg-slate-50 dark:disabled:bg-slate-900 text-slate-900 dark:text-white font-mono"
                />
                {!isEdit && (
                  <p className="text-[10px] text-slate-400 mt-1 font-medium">
                    This is the unique username the driver will use to log in.
                  </p>
                )}
              </div>

              {/* Password */}
              {!isEdit && (
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                    Temporary Password <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Min 6 characters"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all text-slate-900 dark:text-white"
                  />
                </div>
              )}

              {/* Assigned Vehicle */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                  Assign Vehicle
                </label>
                <select
                  value={assignedVehicleId}
                  onChange={(e) => setAssignedVehicleId(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all text-slate-900 dark:text-white"
                >
                  <option value="">-- No vehicle assigned --</option>
                  {availableVehicles.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.vehicleNumber} ({v.vehicleName})
                    </option>
                  ))}
                </select>
                <p className="text-[10px] text-slate-400 mt-1 font-medium">
                  The driver will submit earnings reports for this vehicle.
                </p>
              </div>

              {/* Account Status (Edit Only) */}
              {isEdit && (
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                    Account Status
                  </label>
                  <div className="flex items-center space-x-4">
                    <label className="inline-flex items-center text-sm font-semibold text-slate-700 dark:text-slate-300 cursor-pointer">
                      <input
                        type="radio"
                        name="status"
                        value="Active"
                        checked={status === 'Active'}
                        onChange={() => setStatus('Active')}
                        className="mr-2 text-blue-600 focus:ring-blue-500"
                      />
                      <span>Active</span>
                    </label>
                    <label className="inline-flex items-center text-sm font-semibold text-slate-700 dark:text-slate-300 cursor-pointer">
                      <input
                        type="radio"
                        name="status"
                        value="Disabled"
                        checked={status === 'Disabled'}
                        onChange={() => setStatus('Disabled')}
                        className="mr-2 text-red-600 focus:ring-red-500"
                      />
                      <span className="text-red-600 dark:text-red-400">Disabled</span>
                    </label>
                  </div>
                </div>
              )}

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
                  {submitting ? 'Saving...' : isEdit ? 'Update Profile' : 'Add Driver'}
                </button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleResetPassword} className="space-y-4">
              <div className="p-3.5 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/50 rounded-xl flex items-start space-x-2.5">
                <AlertTriangle className="h-4.5 w-4.5 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-amber-800 dark:text-amber-300 font-medium leading-relaxed">
                  Resetting the password will take effect immediately. Please share the new password with the driver so they can log in.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                  New Password <span className="text-red-500">*</span>
                </label>
                <input
                  type="password"
                  required
                  value={resetPasswordVal}
                  onChange={(e) => setResetPasswordVal(e.target.value)}
                  placeholder="Min 6 characters"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all text-slate-900 dark:text-white"
                />
              </div>

              <div className="pt-4 flex items-center justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setIsResetMode(false)}
                  className="px-4 py-2.5 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl text-xs font-bold transition-all"
                >
                  Back
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all disabled:opacity-50 flex items-center space-x-1.5"
                >
                  <Key className="h-4 w-4" />
                  <span>{submitting ? 'Resetting...' : 'Update Password'}</span>
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
