import React, { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { User, Vehicle } from '../types';
import DriverFormModal from './DriverFormModal';
import { 
  Users, 
  UserPlus, 
  Search, 
  Car, 
  Trash2, 
  ShieldAlert, 
  UserCheck, 
  Key, 
  HelpCircle,
  RefreshCw 
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function DriversView() {
  const [drivers, setDrivers] = useState<User[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Modal controls
  const [showFormModal, setShowFormModal] = useState(false);
  const [selectedDriver, setSelectedDriver] = useState<User | null>(null);

  const fetchDriversAndVehicles = async () => {
    setLoading(true);
    try {
      const [driversData, vehiclesData] = await Promise.all([
        api.getDrivers(),
        api.getVehicles()
      ]);
      setDrivers(driversData.drivers || []);
      setVehicles(vehiclesData.vehicles || []);
    } catch (err: any) {
      toast.error('Failed to load fleet drivers: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDriversAndVehicles();
  }, []);

  const handleCreateNew = () => {
    setSelectedDriver(null);
    setShowFormModal(true);
  };

  const handleEditDriver = (driver: User) => {
    setSelectedDriver(driver);
    setShowFormModal(true);
  };

  const handleDeleteDriver = async (id: string, name: string) => {
    const confirmed = window.confirm(`Are you absolutely sure you want to permanently delete driver ${name}? This action cannot be undone.`);
    if (!confirmed) return;

    try {
      await api.deleteDriver(id);
      toast.success(`Driver ${name} has been removed from the registry.`);
      fetchDriversAndVehicles();
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete driver');
    }
  };

  const handleSaved = () => {
    setShowFormModal(false);
    setSelectedDriver(null);
    fetchDriversAndVehicles();
  };

  // Search filter
  const filteredDrivers = drivers.filter(d => 
    d.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    d.username.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            Driver Management Registry
          </h2>
          <p className="text-xs font-semibold text-slate-400 mt-1">
            Create, edit, reset security credentials, and assign vehicles to fleet drivers
          </p>
        </div>

        <button
          onClick={handleCreateNew}
          className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 shadow-md shadow-blue-500/20"
        >
          <UserPlus className="h-4.5 w-4.5" />
          <span>Add New Driver</span>
        </button>
      </div>

      {/* Search & Utility Bar */}
      <div className="p-4 glass-card rounded-2xl shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:max-w-md">
          <span className="absolute left-3 top-3 text-slate-400">
            <Search className="h-4 w-4" />
          </span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search drivers by name or username..."
            className="w-full pl-9.5 pr-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all text-slate-900 dark:text-white"
          />
        </div>

        <button
          onClick={fetchDriversAndVehicles}
          className="p-2 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 rounded-xl transition-all flex items-center space-x-1 text-xs font-bold"
          title="Refresh database"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          <span>Sync</span>
        </button>
      </div>

      {/* Driver List Display */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-40 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl animate-pulse"></div>
          ))}
        </div>
      ) : filteredDrivers.length === 0 ? (
        <div className="text-center py-20 glass-card rounded-2xl">
          <HelpCircle className="h-12 w-12 mx-auto text-slate-300 dark:text-slate-700 mb-3" />
          <p className="text-sm font-semibold text-slate-500">No fleet drivers registered.</p>
          <p className="text-xs text-slate-400 mt-1">Click "Add New Driver" in the header to register your first active driver.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {filteredDrivers.map((driver) => {
            const assignedVehicle = vehicles.find(v => v.id === driver.assignedVehicleId);
            
            return (
              <div 
                key={driver.id} 
                className="p-5 glass-card rounded-2xl shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between space-y-4"
              >
                <div className="flex items-start justify-between">
                  <div className="space-y-1.5">
                    <div className="flex items-center space-x-2">
                      <h3 className="font-bold text-slate-900 dark:text-white">
                        {driver.name}
                      </h3>
                      <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                        driver.status === 'Active' 
                          ? 'bg-green-100 text-green-700 dark:bg-green-950/45 dark:text-green-400' 
                          : 'bg-red-100 text-red-700 dark:bg-red-950/45 dark:text-red-400'
                      }`}>
                        {driver.status}
                      </span>
                    </div>
                    <p className="text-xs font-semibold text-slate-400 font-mono">
                      @{driver.username}
                    </p>
                  </div>
                  
                  <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-850 border border-slate-100 dark:border-slate-800/50">
                    <Users className="h-5 w-5 text-blue-500" />
                  </div>
                </div>

                <hr className="border-slate-100 dark:border-slate-800" />

                {/* Assigned Vehicle */}
                <div className="flex items-center space-x-2.5 text-xs text-slate-600 dark:text-slate-300">
                  <Car className="h-4.5 w-4.5 text-slate-400" />
                  {assignedVehicle ? (
                    <div>
                      <p className="font-bold text-slate-800 dark:text-slate-200">{assignedVehicle.vehicleNumber}</p>
                      <p className="text-[10px] text-slate-400 font-medium">{assignedVehicle.vehicleName}</p>
                    </div>
                  ) : (
                    <span className="text-slate-400 italic">No commercial vehicle assigned</span>
                  )}
                </div>

                {/* Management Operations */}
                <div className="flex items-center justify-end space-x-2.5 pt-2">
                  <button
                    onClick={() => handleDeleteDriver(driver.id, driver.name)}
                    className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-xl transition-all"
                    title="Remove Driver"
                  >
                    <Trash2 className="h-4.5 w-4.5" />
                  </button>

                  <button
                    onClick={() => handleEditDriver(driver)}
                    className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold transition-all shadow-sm"
                  >
                    Configure / Reset Password
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add / Edit Form Modal */}
      {showFormModal && (
        <DriverFormModal 
          driver={selectedDriver}
          vehicles={vehicles}
          onClose={() => setShowFormModal(false)}
          onSaved={handleSaved}
        />
      )}

    </div>
  );
}
