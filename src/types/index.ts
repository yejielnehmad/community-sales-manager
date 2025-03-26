
export interface MessageItem {
  product: {
    id?: string;
    name: string;
    price?: number;
  };
  variant?: {
    id: string;
    name: string;
    price?: number;
  };
  quantity: number;
  notes?: string;
  status?: 'duda' | 'confirmado';
  alternatives?: MessageAlternative[];
  price?: number;
  total?: number;
  id?: string;
  is_paid?: boolean;
}

export interface MessageAlternative {
  id: string;
  name: string;
  price?: number;
}

export interface MessageClient {
  id: string;
  name: string;
  matchConfidence?: 'alto' | 'medio' | 'bajo';
}

export interface MessageAnalysis {
  client: MessageClient;
  items: MessageItem[];
  pickupLocation?: string;
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
  deleted?: boolean;
  pickupLocation?: string;
}

export interface OrderItem {
  id?: string;
  product_id: string;
  name: string;
  variant?: string;
  variant_id?: string;
  quantity: number;
  price: number;
  total: number;
  is_paid?: boolean;
}

export interface OrderCard {
  id?: string;
  client: MessageClient;
  items: MessageItem[];
  isPaid: boolean;
  status: 'pending' | 'saved';
  isPreliminary?: boolean;
  pickupLocation?: string;
}

export interface Client {
  id?: string;
  name: string;
  phone?: string;
  email?: string;
  address?: string;
  notes?: string;
  totalOrders?: number;
  balance?: number;
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
  price?: number;
}

export interface MessageVariant {
  id: string;
  name: string;
  price?: number;
}

export interface OrdersState {
  isLoading: boolean;
  isRefreshing: boolean;
  orders: Order[];
  error: string | null;
  clientMap: { [key: string]: { name: string } };
  searchTerm: string;
}

export interface OrderItemState {
  productPaidStatus: { [key: string]: boolean };
  swipeStates: { [key: string]: number };
  clientSwipeStates: { [key: string]: number };
  variantSwipeStates: { [key: string]: number };
  editingProduct: string | null;
  editingVariant: string | null;
  productQuantities: { [key: string]: number };
  variantQuantities: { [key: string]: number };
  openClientId: string | null;
  _pendingOpenClientId?: string | null;
  orderToDelete: string | null;
  clientToDelete: string | null;
  isSaving: boolean;
  isDeleting: boolean;
  productItemRefs: { [key: string]: HTMLDivElement | null };
  clientItemRefs: { [key: string]: HTMLDivElement | null };
  touchEnabled?: boolean;
  lastInteraction?: number;
}

export interface OrdersContextProps {
  state: OrdersState;
  itemState: OrderItemState;
  actions: {
    fetchOrders: (refresh?: boolean) => Promise<void>;
    setSearchTerm: (term: string) => void;
    handleToggleProductPaid: (productKey: string, orderId: string, itemId: string, isPaid: boolean) => Promise<void>;
    handleToggleAllProducts: (clientId: string, isPaid: boolean) => Promise<void>;
    handleDeleteOrder: () => Promise<void>;
    handleDeleteClientOrders: () => Promise<void>;
    handleEditProduct: (productKey: string, currentQuantity: number, isPaid: boolean) => void;
    handleEditVariant: (variantKey: string, currentQuantity: number, isPaid: boolean) => void;
    handleQuantityChange: (productKey: string, newQuantity: number) => void;
    handleVariantQuantityChange: (variantKey: string, newQuantity: number) => void;
    saveProductChanges: (productKey: string, orderId: string, itemId: string) => Promise<void>;
    saveVariantChanges: (variantKey: string, orderId: string, itemId: string) => Promise<void>;
    deleteProduct: (productKey: string, orderId: string, itemId: string) => Promise<void>;
    deleteVariant: (variantKey: string, orderId: string, itemId: string) => Promise<void>;
    toggleClient: (clientId: string) => void;
    setOrderToDelete: (orderId: string | null) => void;
    setClientToDelete: (clientId: string | null) => void;
    handleProductSwipe: (productKey: string, deltaX: number) => void;
    handleVariantSwipe: (variantKey: string, deltaX: number) => void;
    handleClientSwipe: (clientId: string, deltaX: number) => void;
    completeSwipeAnimation: (productKey: string) => void;
    completeVariantSwipeAnimation: (variantKey: string) => void;
    completeClientSwipeAnimation: (clientId: string) => void;
    closeAllSwipes: (exceptKey?: string) => void;
    registerProductRef: (key: string, ref: HTMLDivElement | null) => void;
    registerClientRef: (key: string, ref: HTMLDivElement | null) => void;
  };
}
