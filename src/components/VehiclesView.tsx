import React, { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { Vehicle, User } from '../types';
import VehicleFormModal from './VehicleFormModal';
import { 
  Car, 
  PlusCircle, 
  Search, 
  Trash2, 
  Calendar, 
  User as UserIcon, 
  CheckCircle, 
  AlertTriangle, 
  Wrench,
  RefreshCw,
  HelpCircle
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function VehiclesView() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [drivers, setDrivers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Modals controls
  const [showFormModal, setShowFormModal] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);

  const fetchVehiclesAndDrivers = async () => {
    setLoading(true);
    try {
      const [vehiclesData, driversData] = await Promise.all([
        api.getVehicles(),
        api.getDrivers()
      ]);
      setVehicles(vehiclesData.vehicles || []);
      setDrivers(driversData.drivers || []);
    } catch (err: any) {
      toast.error('Failed to load vehicle parameters: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVehiclesAndDrivers();
  }, []);

  const handleCreateNew = () => {
    setSelectedVehicle(null);
    setShowFormModal(true);
  };

  const handleEditVehicle = (vehicle: Vehicle) => {
    setSelectedVehicle(vehicle);
    setShowFormModal(true);
  };

  const handleDeleteVehicle = async (id: string, num: string) => {
    const confirmed = window.confirm(`Are you sure you want to permanently delete vehicle ${num}? This will unassign its current driver.`);
    if (!confirmed) return;

    try {
      await api.deleteVehicle(id);
      toast.success(`Vehicle ${num} deleted successfully`);
      fetchVehiclesAndDrivers();
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete vehicle');
    }
  };

  const handleSaved = () => {
    setShowFormModal(false);
    setSelectedVehicle(null);
    fetchVehiclesAndDrivers();
  };

  const filteredVehicles = vehicles.filter(v => 
    v.vehicleNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
    v.vehicleName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    v.brand.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const isInsuranceNearExpiry = (expiryStr: string) => {
    if (!expiryStr) return false;
    const expiry = new Date(expiryStr);
    const today = new Date();
    const diffTime = expiry.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays >= 0 && diffDays <= 30; // 30 days window
  };

  const isInsuranceExpired = (expiryStr: string) => {
    if (!expiryStr) return false;
    const expiry = new Date(expiryStr);
    const today = new Date();
    return expiry < today;
  };

  return (
    <div className="space-y-6">
      
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            Vehicle Fleet Register
          </h2>
          <p className="text-xs font-semibold text-slate-400 mt-1">
            Store, monitor, and configure operational assets, insurance details, and driver maps
          </p>
        </div>

        <button
          onClick={handleCreateNew}
          className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 shadow-md shadow-blue-500/20"
        >
          <PlusCircle className="h-4.5 w-4.5" />
          <span>Register Vehicle</span>
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
            placeholder="Search vehicles by license plate, brand, or name..."
            className="w-full pl-9.5 pr-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all text-slate-900 dark:text-white"
          />
        </div>

        <button
          onClick={fetchVehiclesAndDrivers}
          className="p-2 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 rounded-xl transition-all flex items-center space-x-1 text-xs font-bold"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          <span>Sync</span>
        </button>
      </div>

      {/* Grid view */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-44 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl animate-pulse"></div>
          ))}
        </div>
      ) : filteredVehicles.length === 0 ? (
        <div className="text-center py-20 glass-card rounded-2xl">
          <HelpCircle className="h-12 w-12 mx-auto text-slate-300 dark:text-slate-700 mb-3" />
          <p className="text-sm font-semibold text-slate-500">No fleet vehicles registered.</p>
          <p className="text-xs text-slate-400 mt-1">Click "Register Vehicle" to insert your first active commercial vehicle.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredVehicles.map((vehicle) => {
            const assignedDriver = drivers.find(d => d.id === vehicle.assignedDriverId);
            const expired = isInsuranceExpired(vehicle.insuranceExpiry);
            const expiringSoon = isInsuranceNearExpiry(vehicle.insuranceExpiry);

            return (
              <div 
                key={vehicle.id}
                className="p-5 glass-card rounded-2xl shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between space-y-4"
              >
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <span className="text-[10px] font-mono tracking-widest bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-2 py-1 rounded-md font-extrabold uppercase">
                      {vehicle.vehicleNumber}
                    </span>
                    <h3 className="font-extrabold text-slate-900 dark:text-white pt-1 text-sm">
                      {vehicle.vehicleName}
                    </h3>
                  </div>

                  <span className={`p-2 rounded-lg text-xs font-bold flex items-center space-x-1 ${
                    vehicle.status === 'Active' 
                      ? 'bg-green-50 text-green-600 dark:bg-green-950/30 dark:text-green-400'
                      : vehicle.status === 'Maintenance'
                      ? 'bg-amber-50 text-amber-600 dark:bg-amber-950/30 dark:text-amber-400'
                      : 'bg-red-50 text-red-600 dark:bg-red-950/30 dark:text-red-400'
                  }`}>
                    {vehicle.status === 'Active' && <CheckCircle className="h-4 w-4" />}
                    {vehicle.status === 'Maintenance' && <Wrench className="h-4 w-4" />}
                    {vehicle.status === 'Inactive' && <AlertTriangle className="h-4 w-4" />}
                    <span className="hidden xs:inline">{vehicle.status}</span>
                  </span>
                </div>

                <hr className="border-slate-100 dark:border-slate-800" />

                {/* Info Fields */}
                <div className="space-y-2.5 text-xs">
                  {/* Assigned Driver */}
                  <div className="flex items-center space-x-2 text-slate-600 dark:text-slate-300">
                    <UserIcon className="h-4 w-4 text-slate-400" />
                    <span className="font-semibold">Driver:</span>
                    {assignedDriver ? (
                      <span className="font-bold text-slate-900 dark:text-white">{assignedDriver.name}</span>
                    ) : (
                      <span className="text-slate-400 italic">No driver assigned</span>
                    )}
                  </div>

                  {/* Insurance Expiry */}
                  <div className="flex items-center space-x-2 text-slate-600 dark:text-slate-300">
                    <Calendar className="h-4 w-4 text-slate-400" />
                    <span className="font-semibold">Insurance:</span>
                    {vehicle.insuranceExpiry ? (
                      <span className={`font-mono font-bold flex items-center space-x-1 ${
                        expired 
                          ? 'text-red-600 dark:text-red-400' 
                          : expiringSoon 
                          ? 'text-amber-600 dark:text-amber-400' 
                          : 'text-slate-700 dark:text-slate-200'
                      }`}>
                        <span>{vehicle.insuranceExpiry}</span>
                        {expired && <span className="text-[9px] font-semibold bg-red-100 dark:bg-red-950 px-1 py-0.5 rounded text-red-700">Expired</span>}
                        {expiringSoon && <span className="text-[9px] font-semibold bg-amber-100 dark:bg-amber-950 px-1 py-0.5 rounded text-amber-700">Renew</span>}
                      </span>
                    ) : (
                      <span className="text-slate-400 italic">Not recorded</span>
                    )}
                  </div>
                </div>

                {/* Footer Controls */}
                <div className="flex items-center justify-end space-x-2.5 pt-2">
                  <button
                    onClick={() => handleDeleteVehicle(vehicle.id, vehicle.vehicleNumber)}
                    className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-xl transition-all"
                    title="Delete Vehicle"
                  >
                    <Trash2 className="h-4.5 w-4.5" />
                  </button>

                  <button
                    onClick={() => handleEditVehicle(vehicle)}
                    className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold transition-all shadow-sm"
                  >
                    Edit Details
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Form Modal */}
      {showFormModal && (
        <VehicleFormModal 
          vehicle={selectedVehicle}
          drivers={drivers}
          onClose={() => setShowFormModal(false)}
          onSaved={handleSaved}
        />
      )}

    </div>
  );
}
