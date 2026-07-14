const API_BASE = '/api';

function getHeaders(): HeadersInit {
  const token = localStorage.getItem('fleet_token');
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

export async function apiRequest<T>(method: string, endpoint: string, body?: any): Promise<T> {
  const url = `${API_BASE}${endpoint}`;
  const options: RequestInit = {
    method,
    headers: getHeaders(),
  };

  if (body) {
    options.body = JSON.stringify(body);
  }

  const response = await fetch(url, options);
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'Something went wrong');
  }

  return data as T;
}

export const api = {
  // Auth
  login: (username: string, password: string) => 
    apiRequest<any>('POST', '/auth/login', { username, password }),
  
  getMe: () => 
    apiRequest<any>('GET', '/auth/me'),

  // Drivers
  getDrivers: () => 
    apiRequest<any>('GET', '/drivers'),
  
  createDriver: (payload: any) => 
    apiRequest<any>('POST', '/drivers', payload),
  
  updateDriver: (id: string, payload: any) => 
    apiRequest<any>('PUT', `/drivers/${id}`, payload),
  
  resetDriverPassword: (id: string, payload: any) => 
    apiRequest<any>('PUT', `/drivers/${id}/reset-password`, payload),
  
  deleteDriver: (id: string) => 
    apiRequest<any>('DELETE', `/drivers/${id}`),

  // Vehicles
  getVehicles: () => 
    apiRequest<any>('GET', '/vehicles'),
  
  createVehicle: (payload: any) => 
    apiRequest<any>('POST', '/vehicles', payload),
  
  updateVehicle: (id: string, payload: any) => 
    apiRequest<any>('PUT', `/vehicles/${id}`, payload),
  
  deleteVehicle: (id: string) => 
    apiRequest<any>('DELETE', `/vehicles/${id}`),

  // Settings
  getSettings: () => 
    apiRequest<any>('GET', '/settings'),
  
  updateSettings: (payload: any) => 
    apiRequest<any>('PUT', '/settings', payload),

  // Reports
  getReports: (filters: any = {}) => {
    const params = new URLSearchParams();
    Object.keys(filters).forEach((key) => {
      if (filters[key] !== undefined && filters[key] !== '') {
        params.append(key, filters[key]);
      }
    });
    const queryString = params.toString();
    return apiRequest<any>('GET', `/reports${queryString ? `?${queryString}` : ''}`);
  },

  getReportById: (id: string) => 
    apiRequest<any>('GET', `/reports/${id}`),

  submitReport: (payload: any) => 
    apiRequest<any>('POST', '/reports', payload),

  settleReport: (id: string, settlementStatus: 'Pending' | 'Paid') => 
    apiRequest<any>('PUT', `/reports/${id}/settle`, { settlementStatus }),

  recordSettlementPayment: (id: string, payload: { amount: number; date: string; method: string; notes?: string }) =>
    apiRequest<any>('POST', `/reports/${id}/payments`, payload),

  // Stats
  getDashboardStats: () => 
    apiRequest<any>('GET', '/stats/dashboard'),

  // Upload proof image
  uploadImage: (base64: string, filename: string) => 
    apiRequest<any>('POST', '/upload', { base64, filename }),
};
