export type UserRole = 'Owner' | 'Driver';

export interface User {
  id: string;
  username: string;
  name: string;
  role: UserRole;
  status: 'Active' | 'Disabled';
  assignedVehicleId?: string;
  createdAt: string;
}

export interface Vehicle {
  id: string;
  vehicleNumber: string;
  vehicleName: string;
  brand: string;
  model: string;
  insuranceExpiry: string;
  assignedDriverId?: string;
  status: 'Active' | 'Maintenance' | 'Inactive';
}

export interface CommissionSettings {
  threshold: number;      // e.g. 4000
  belowThreshold: number;  // e.g. 20 (percent)
  aboveThreshold: number;  // e.g. 30 (percent)
}

export type FuelPaidBy = 'Driver' | 'Owner';
export type FuelType = 'CNG' | 'Petrol' | 'Diesel';
export type SettlementStatus = 'Pending' | 'Paid';

export interface ReportImage {
  name: string;
  url: string; // Base64 or local URL representation
}

export interface SettlementPayment {
  id: string;
  amount: number;
  date: string; // YYYY-MM-DD
  method: 'Cash' | 'UPI' | 'Bank Transfer';
  notes?: string;
}

export interface DailyReport {
  id: string;
  driverId: string;
  driverName: string;
  date: string; // YYYY-MM-DD
  vehicleId: string;
  vehicleNumber: string;
  
  // Rides
  olaRides: number;
  uberRides: number;
  rapidoRides: number;
  otherRides: number;
  totalRides: number;
  
  // Earnings
  olaEarnings: number;
  uberEarnings: number;
  rapidoEarnings: number;
  otherEarnings: number;
  totalEarnings: number;
  
  // Commission Calculations
  commissionPercent: number;
  commissionAmount: number;
  
  // Fuel
  fuelPaidBy: FuelPaidBy;
  fuelType: FuelType;
  fuelAmount: number;
  
  // Settlements / Results
  driverKeeps: number;
  ownerDue: number;
  settlementStatus: SettlementStatus;
  
  // Settlement Advanced Fields
  amountCollected?: number;
  pendingAmount?: number;
  settlementHistory?: SettlementPayment[];

  // Supporting Proofs
  images: ReportImage[];
  
  // Kilometer Tracking
  startingKM?: number;
  endingKM?: number;
  totalDistance?: number;

  createdAt: string;
}

export interface TimeframeSummary {
  driversWorked: number;
  rides: number;
  earnings: number;
  commission: number;
  fuelExpense: number;
  ownerReceivable: number;
  amountCollected: number;
  pendingCollection: number;
  kilometers: number;
}

export interface DashboardStats {
  totalDrivers: number;
  todaySummary: TimeframeSummary;
  weeklySummary: TimeframeSummary;
  monthlySummary: TimeframeSummary;
  overallSummary: TimeframeSummary;
  pendingSettlementsCount: number;
  completedSettlementsCount: number;
}
