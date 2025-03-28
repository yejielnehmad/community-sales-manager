
import { useState, useRef, useCallback, useEffect } from 'react';
import { OrderItemState } from '@/types';

export const useItemState = () => {
  const [itemState, setItemState] = useState<OrderItemState>({
    productPaidStatus: {},
    swipeStates: {},
    clientSwipeStates: {},
    variantSwipeStates: {},
    editingProduct: null,
    editingVariant: null,
    productQuantities: {},
    variantQuantities: {},
    openClientId: null,
    _pendingOpenClientId: null,
    orderToDelete: null,
    clientToDelete: null,
    isSaving: false,
    isDeleting: false,
    productItemRefs: {},
    clientItemRefs: {},
    touchEnabled: false,
    lastInteraction: 0
  });
  
  const touchStartXRef = useRef<number | null>(null);
  const clientTouchStartXRef = useRef<number | null>(null);
  const productItemRefs = useRef<{[key: string]: HTMLDivElement | null}>({});
  const clientItemRefs = useRef<{[key: string]: HTMLDivElement | null}>({});
  
  const handleProductSwipe = useCallback((productKey: string, deltaX: number) => {
    const newSwipeX = Math.max(-140, Math.min(0, deltaX));
    
    setItemState(prev => ({
      ...prev,
      swipeStates: {
        ...prev.swipeStates,
        [productKey]: newSwipeX
      }
    }));
  }, []);

  const handleVariantSwipe = useCallback((variantKey: string, deltaX: number) => {
    const newSwipeX = Math.max(-70, Math.min(0, deltaX));
    
    setItemState(prev => ({
      ...prev,
      variantSwipeStates: {
        ...prev.variantSwipeStates,
        [variantKey]: newSwipeX
      }
    }));
  }, []);

  const handleClientSwipe = useCallback((clientId: string, deltaX: number) => {
    const newSwipeX = Math.max(-70, Math.min(0, deltaX));
    
    setItemState(prev => ({
      ...prev,
      clientSwipeStates: {
        ...prev.clientSwipeStates,
        [clientId]: newSwipeX
      }
    }));
  }, []);

  const completeSwipeAnimation = useCallback((productKey: string) => {
    setItemState(prev => {
      const currentSwipe = prev.swipeStates[productKey] || 0;
      
      if (currentSwipe < -70) {
        return {
          ...prev,
          swipeStates: {
            ...prev.swipeStates,
            [productKey]: -140
          }
        };
      } 
      else if (currentSwipe > -70 && currentSwipe < 0) {
        return {
          ...prev,
          swipeStates: {
            ...prev.swipeStates,
            [productKey]: 0
          }
        };
      }
      return prev;
    });
  }, []);

  const completeVariantSwipeAnimation = useCallback((variantKey: string) => {
    setItemState(prev => {
      const currentSwipe = prev.variantSwipeStates[variantKey] || 0;
      
      if (currentSwipe < -35) {
        return {
          ...prev,
          variantSwipeStates: {
            ...prev.variantSwipeStates,
            [variantKey]: -70
          }
        };
      } 
      else if (currentSwipe > -35 && currentSwipe < 0) {
        return {
          ...prev,
          variantSwipeStates: {
            ...prev.variantSwipeStates,
            [variantKey]: 0
          }
        };
      }
      return prev;
    });
  }, []);

  const completeClientSwipeAnimation = useCallback((clientId: string) => {
    setItemState(prev => {
      const currentSwipe = prev.clientSwipeStates[clientId] || 0;
      
      if (currentSwipe < -35) {
        return {
          ...prev,
          clientSwipeStates: {
            ...prev.clientSwipeStates,
            [clientId]: -70
          }
        };
      } 
      else if (currentSwipe > -35 && currentSwipe < 0) {
        return {
          ...prev,
          clientSwipeStates: {
            ...prev.clientSwipeStates,
            [clientId]: 0
          }
        };
      }
      return prev;
    });
  }, []);

  const closeAllSwipes = useCallback((exceptKey?: string) => {
    setItemState(prev => {
      const newSwipeStates = { ...prev.swipeStates };
      const newClientSwipeStates = { ...prev.clientSwipeStates };
      const newVariantSwipeStates = { ...prev.variantSwipeStates };
      
      Object.keys(newSwipeStates).forEach(key => {
        if (key !== exceptKey) {
          newSwipeStates[key] = 0;
        }
      });
      
      Object.keys(newClientSwipeStates).forEach(key => {
        if (key !== exceptKey) {
          newClientSwipeStates[key] = 0;
        }
      });
      
      Object.keys(newVariantSwipeStates).forEach(key => {
        if (key !== exceptKey) {
          newVariantSwipeStates[key] = 0;
        }
      });
      
      return {
        ...prev,
        swipeStates: newSwipeStates,
        clientSwipeStates: newClientSwipeStates,
        variantSwipeStates: newVariantSwipeStates
      };
    });
  }, []);

  const registerProductRef = useCallback((key: string, ref: HTMLDivElement | null) => {
    productItemRefs.current[key] = ref;
  }, []);

  const registerClientRef = useCallback((key: string, ref: HTMLDivElement | null) => {
    clientItemRefs.current[key] = ref;
  }, []);
  
  const handleEditProduct = useCallback((productKey: string, currentQuantity: number, isPaid: boolean) => {
    setItemState(prev => ({
      ...prev,
      editingProduct: productKey,
      productQuantities: {
        ...prev.productQuantities,
        [productKey]: currentQuantity
      }
    }));
  }, []);

  const handleEditVariant = useCallback((variantKey: string, currentQuantity: number, isPaid: boolean) => {
    setItemState(prev => ({
      ...prev,
      editingVariant: variantKey,
      variantQuantities: {
        ...prev.variantQuantities,
        [variantKey]: currentQuantity
      }
    }));
  }, []);

  const handleQuantityChange = useCallback((productKey: string, newQuantity: number) => {
    setItemState(prev => ({
      ...prev,
      productQuantities: {
        ...prev.productQuantities,
        [productKey]: Math.max(1, newQuantity)
      }
    }));
  }, []);

  const handleVariantQuantityChange = useCallback((variantKey: string, newQuantity: number) => {
    setItemState(prev => ({
      ...prev,
      variantQuantities: {
        ...prev.variantQuantities,
        [variantKey]: Math.max(1, newQuantity)
      }
    }));
  }, []);
  
  const toggleClient = useCallback((clientId: string) => {
    setItemState(prev => {
      if (prev.openClientId && prev.openClientId !== clientId) {
        return {
          ...prev,
          _pendingOpenClientId: clientId,
          openClientId: null
        };
      } else {
        return {
          ...prev,
          openClientId: prev.openClientId === clientId ? null : clientId
        };
      }
    });
  }, []);
  
  useEffect(() => {
    if (itemState._pendingOpenClientId && !itemState.openClientId) {
      const timer = setTimeout(() => {
        setItemState(prev => ({
          ...prev,
          openClientId: prev._pendingOpenClientId,
          _pendingOpenClientId: null
        }));
      }, 50);
      
      return () => clearTimeout(timer);
    }
  }, [itemState.openClientId, itemState._pendingOpenClientId]);
  
  const setOrderToDelete = useCallback((orderId: string | null) => {
    setItemState(prev => ({ ...prev, orderToDelete: orderId }));
  }, []);
  
  const setClientToDelete = useCallback((clientId: string | null) => {
    setItemState(prev => ({ ...prev, clientToDelete: clientId }));
  }, []);

  return {
    itemState,
    setItemState,
    handleProductSwipe,
    handleVariantSwipe,
    handleClientSwipe,
    completeSwipeAnimation,
    completeVariantSwipeAnimation,
    completeClientSwipeAnimation,
    closeAllSwipes,
    registerProductRef,
    registerClientRef,
    handleEditProduct,
    handleEditVariant,
    handleQuantityChange,
    handleVariantQuantityChange,
    toggleClient,
    setOrderToDelete,
    setClientToDelete,
    refs: {
      touchStartXRef,
      clientTouchStartXRef,
      productItemRefs,
      clientItemRefs
    }
  };
};
