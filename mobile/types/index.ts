export interface User {
  id: string;
  email: string;
  name: string;
  role: 'OWNER' | 'ADMIN' | 'CLEANER' | 'CUSTOMER';
  companyId: string;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

export interface Client {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
}

export interface Address {
  id: string;
  street: string;
  unit: string | null;
  city: string;
  state: string;
  zip: string;
  gateCode: string | null;
  parkingInfo: string | null;
  petInfo: string | null;
  specialInstructions: string | null;
}

export interface Job {
  id: string;
  scheduledDate: string;
  scheduledTime: string | null;
  duration: number;
  status: 'SCHEDULED' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW';
  serviceType: string;
  price: number;
  onMyWaySentAt: string | null;
  clockedInAt: string | null;
  clockedOutAt: string | null;
  notes: string | null;
  client: Client;
  address: Address | null;
}

export interface CleanerProfile {
  id: string;
  userId: string;
  hourlyRate: number | null;
  employeeId: string | null;
  hireDate: string | null;
  phone: string | null;
  street: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  emergencyContactName: string | null;
  emergencyContactPhone: string | null;
  experienceLevel: string | null;
  specialties: string[];
  serviceAreas: string[];
  user: {
    name: string;
    email: string;
  };
}

export interface ApiResponse<T> {
  data?: T;
  error?: string;
  message?: string;
}
