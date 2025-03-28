
import { Order, MessageClient, OrderItemState, OrdersState } from '@/types';

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
    handleAddAllOrders: () => Promise<void>;
  };
}
