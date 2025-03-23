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
  id?: string;
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
}
