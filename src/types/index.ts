
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

// Interfaces para análisis de mensajes
export interface MessageProduct {
  id?: string;
  name: string;
}

export interface MessageVariant {
  id?: string;
  name: string;
}

export interface MessageAlternative {
  id: string;
  name: string;
}

export interface MessageItem {
  product: MessageProduct;
  quantity: number;
  variant?: MessageVariant;
  status: 'confirmado' | 'duda';
  alternatives?: MessageAlternative[];
  notes?: string;
}

export interface MessageClient {
  id?: string;
  name: string;
  matchConfidence?: 'alto' | 'medio' | 'bajo';
}

export interface MessageAnalysis {
  client: MessageClient;
  items: MessageItem[];
}

export interface OrderCard {
  id?: string;
  client: MessageClient;
  items: MessageItem[];
  isPaid: boolean;
  status: 'pending' | 'saved';
}
