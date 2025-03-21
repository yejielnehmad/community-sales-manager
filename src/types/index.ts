
export interface Client {
  id: string;
  name: string;
  phone?: string;
  createdAt: string;
  totalOrders: number;
  balance: number;
}

export interface ProductVariant {
  id: string;
  name: string;
  price: number;
}

export interface Product {
  id: string;
  name: string;
  description?: string;
  price: number;
  variants?: ProductVariant[];
}

export interface OrderItem {
  id: string;
  productId: string;
  productName: string;
  variantId?: string;
  variantName?: string;
  quantity: number;
  price: number;
  total: number;
}

export interface Order {
  id: string;
  clientId: string;
  clientName: string;
  date: string;
  status: 'pending' | 'completed' | 'cancelled';
  items: OrderItem[];
  total: number;
  amountPaid: number;
  balance: number;
}

export interface MessageAnalysis {
  client?: {
    id?: string;
    name: string;
  };
  items: {
    product: string;
    quantity: number;
    variant?: string;
  }[];
}
