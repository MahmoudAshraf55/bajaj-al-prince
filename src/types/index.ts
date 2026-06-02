export interface ContactFormData {
  name: string;
  phone: string;
  email: string;
  message: string;
}

export interface BookingFormData {
  name: string;
  phone: string;
  model: string;
  issue: string;
  date: string;
  time: string;
  plateNumber?: string;
  customerId?: string;
  vehicleId?: string;
}

export interface ProductData {
  id: string;
  name: string;
  description: string | null;
  price: number;
  stock: number;
  category: string;
  image: string | null;
  available: boolean;
}

export interface TransactionData {
  id: string;
  type: string;
  amount: number;
  description: string | null;
  createdAt: Date;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  address: string | null;
  vehicles: Vehicle[];
  createdAt: string;
  updatedAt: string | null;
  _count?: { vehicles: number };
}

export interface Vehicle {
  id: string;
  make: string;
  model: string;
  year: number | null;
  chassisNumber: string | null;
  plateNumber: string | null;
  customerId: string;
  customer?: Customer;
  createdAt: string;
  updatedAt: string | null;
}
