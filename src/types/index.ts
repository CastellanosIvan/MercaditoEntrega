export interface Product {
  id: number;
  title: string;
  price: number; // in USD
  description: string;
  category: string;
  image: string;
  rating?: {
    rate: number;
    count: number;
  };
  barcode?: string;
}

export interface CartItem {
  id: number;
  product: Product;
  quantity: number;
}

export type PaymentMethod = 'Apple Pay' | 'PayPal' | 'Tarjeta Bancaria';

export interface Order {
  id: string;
  date: string;
  items: CartItem[];
  subtotalMXN: number;
  shippingMXN: number;
  totalMXN: number;
  method: PaymentMethod;
  address: string;
  receiptFileName?: string;
  status: 'Completado' | 'En camino' | 'Procesando';
}

export interface StoredFile {
  id: string;
  name: string;
  size: number;
  type: string;
  createdAt: string;
  dataUrl?: string;
  downloadUrl?: string;
}

export interface GeoLocationState {
  latitude: number | null;
  longitude: number | null;
  address: string;
  distanceKm: number | null;
  shippingMXN: number;
  loading: boolean;
  error?: string | null;
}
