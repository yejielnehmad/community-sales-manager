
export interface MessageItem {
  product: {
    id?: string;
    name: string;
  };
  variant?: {
    id: string;
    name: string;
  };
  quantity: number;
  notes?: string;
  status?: 'duda' | 'confirmado';
  alternatives?: MessageAlternative[];
}

export interface MessageAlternative {
  id: string;
  name: string;
}

export interface MessageClient {
  id: string;  // Aquí cambio id de opcional a requerido
  name: string;
  matchConfidence?: 'alto' | 'medio' | 'bajo';
}

export interface MessageAnalysis {
  client: MessageClient;
  items: MessageItem[];
}

export interface Order {
  id: string;
  clientId: string;
  clientName: string;
  date: string;
  status: 'pending' | 'completed' | 'cancelled';
  items: any[];
  total: number;
  amountPaid: number;
  balance: number;
}

export interface OrderCard {
  id?: string;
  client: MessageClient;
  items: MessageItem[];
  isPaid: boolean;
  status: 'pending' | 'saved';
  isPreliminary?: boolean;
}

export interface Client {
  id?: string;
  name: string;
  phone?: string;
  email?: string;
  address?: string;
  notes?: string;
  totalOrders?: number;  // Agregando la propiedad totalOrders
  balance?: number;      // Agregando la propiedad balance
}

export interface Product {
  id?: string;
  name: string;
  price: number;
  description?: string;
  variants?: ProductVariant[];
}

export interface ProductVariant {
  id: string;
  product_id: string;
  name: string;
  price: number;
}

export interface MessageProduct {
  id?: string;
  name: string;
}

export interface MessageVariant {
  id: string;
  name: string;
}
