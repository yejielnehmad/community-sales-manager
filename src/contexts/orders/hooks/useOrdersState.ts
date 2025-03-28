
import { useState, useCallback } from 'react';
import { Order, OrdersState } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { fetchOrdersData, mapApiItemsToOrderItems } from '../services/ordersService';
import { clearAnalysisCache } from '@/services/messageAnalysisService';
import { purgeAllAnalysisData } from '@/services/geminiService';

export const useOrdersState = () => {
  const { toast } = useToast();
  
  const [state, setState] = useState<OrdersState>({
    isLoading: true,
    isRefreshing: false,
    orders: [],
    error: null,
    clientMap: {},
    searchTerm: ''
  });
  
  const resetOrdersState = useCallback(() => {
    setState(prev => ({ 
      ...prev, 
      orders: [],
      error: null
    }));
    
    // Usar la función centralizada para purgar todos los datos
    const { localStorageKeysRemoved, sessionStorageKeysRemoved } = purgeAllAnalysisData();
    
    console.log("Estado de órdenes y análisis completamente reiniciado", {
      localStorageKeysRemoved,
      sessionStorageKeysRemoved
    });
    
    // Disparar evento de estado reiniciado
    window.dispatchEvent(new Event('ordersStateReset'));
    
  }, []);
  
  const setSearchTerm = (term: string) => {
    setState(prev => ({ ...prev, searchTerm: term }));
  };

  const fetchOrders = useCallback(async (refresh = false) => {
    if (refresh) {
      setState(prev => ({ ...prev, isRefreshing: true }));
    } else {
      setState(prev => ({ ...prev, isLoading: true }));
    }
    setState(prev => ({ ...prev, error: null }));
    
    try {
      const {
        ordersData,
        clientsData,
        orderItemsData,
        productsData,
        variantsData
      } = await fetchOrdersData();

      if (ordersData.length === 0) {
        setState(prev => ({ 
          ...prev, 
          orders: [],
          isLoading: false,
          isRefreshing: false
        }));
        return;
      }

      // Procesar los datos obtenidos
      const productMap: { [key: string]: {name: string, price: number} } = {};
      productsData.forEach(product => {
        productMap[product.id] = {
          name: product.name,
          price: product.price || 0
        };
      });
      
      const variantMap: { [key: string]: {name: string, price: number} } = {};
      variantsData.forEach(variant => {
        variantMap[variant.id] = {
          name: variant.name,
          price: variant.price || 0
        };
      });
      
      console.log("Mapas de productos y variantes creados:", {
        productMap: Object.keys(productMap).length,
        variantMap: Object.keys(variantMap).length
      });

      const orderItemsMap: { [key: string]: any[] } = {};
      if (orderItemsData) {
        orderItemsData.forEach(item => {
          if (!orderItemsMap[item.order_id]) {
            orderItemsMap[item.order_id] = [];
          }
          orderItemsMap[item.order_id].push(item);
        });
      }

      if (clientsData) {
        const clientMap: { [key: string]: { name: string } } = {};
        clientsData.forEach(client => {
          clientMap[client.id] = { name: client.name };
        });
        
        const transformedOrders: Order[] = ordersData.map((order: any) => ({
          id: order.id,
          clientId: order.client_id,
          clientName: clientMap[order.client_id]?.name || "Cliente desconocido",
          date: order.date || "",
          status: order.status as 'pending' | 'completed' | 'cancelled',
          items: orderItemsMap[order.id] 
            ? mapApiItemsToOrderItems(orderItemsMap[order.id], productMap, variantMap) 
            : [],
          total: order.total,
          amountPaid: order.amount_paid,
          balance: order.balance
        }));
        
        console.log(`Transformados ${transformedOrders.length} pedidos con sus items`);
        
        setState(prev => ({
          ...prev,
          orders: transformedOrders,
          clientMap,
          isLoading: false,
          isRefreshing: false
        }));
      }
    } catch (error: any) {
      console.error("Error al cargar pedidos:", error);
      setState(prev => ({
        ...prev,
        error: error.message || "Error al cargar pedidos",
        isLoading: false,
        isRefreshing: false
      }));
      toast({
        title: "Error al cargar los pedidos",
        description: error.message || "Ha ocurrido un error al cargar los pedidos. Intente nuevamente.",
        variant: "destructive"
      });
    }
  }, [toast]);

  return {
    state,
    setState,
    setSearchTerm,
    fetchOrders,
    resetOrdersState
  };
};
