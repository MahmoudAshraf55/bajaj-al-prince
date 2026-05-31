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
