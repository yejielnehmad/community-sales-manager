
import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/lib/supabase";
import { Loader2, Package, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogClose,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { OrderCardList } from "./OrderCardList";
import { Order } from "@/types";

interface ProductBalance {
  id: string;
  name: string;
  pendingAmount: number;
  icon?: React.ReactNode;
  orders: Order[];
}

export const ProductPendingBalances = () => {
  const [productBalances, setProductBalances] = useState<ProductBalance[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedProduct, setSelectedProduct] = useState<ProductBalance | null>(null);

  useEffect(() => {
    fetchProductBalances();
  }, []);

  const fetchProductBalances = async () => {
    setIsLoading(true);
    try {
      // Primero obtenemos todos los pedidos con saldo pendiente
      const { data: pendingOrders, error: ordersError } = await supabase
        .from('orders')
        .select('*')
        .gt('balance', 0);
        
      if (ordersError) throw ordersError;
      
      if (!pendingOrders || pendingOrders.length === 0) {
        setProductBalances([]);
        setIsLoading(false);
        return;
      }
      
      // Obtenemos los IDs de los pedidos
      const orderIds = pendingOrders.map(order => order.id);
      
      // Obtenemos los items de los pedidos
      const { data: orderItems, error: itemsError } = await supabase
        .from('order_items')
        .select('*')
        .in('order_id', orderIds);
        
      if (itemsError) throw itemsError;
      
      // Obtenemos los clientes
      const clientIds = [...new Set(pendingOrders.map(order => order.client_id))];
      const { data: clients, error: clientsError } = await supabase
        .from('clients')
        .select('id, name')
        .in('id', clientIds);
        
      if (clientsError) throw clientsError;
      
      // Mapa de clientes
      const clientMap: { [key: string]: string } = {};
      clients?.forEach(client => {
        clientMap[client.id] = client.name;
      });
      
      // Obtenemos productos
      const productIds = [...new Set(orderItems?.map(item => item.product_id) || [])];
      const { data: products, error: productsError } = await supabase
        .from('products')
        .select('id, name')
        .in('id', productIds);
        
      if (productsError) throw productsError;
      
      // Obtener variantes si es necesario
      const variantIds = orderItems?.filter(item => item.variant_id).map(item => item.variant_id) || [];
      let variants: any[] = [];
      
      if (variantIds.length > 0) {
        const { data: variantsData, error: variantsError } = await supabase
          .from('product_variants')
          .select('id, name, product_id')
          .in('id', variantIds);
          
        if (variantsError) throw variantsError;
        variants = variantsData || [];
      }
      
      // Crear mapas
      const productMap: { [key: string]: string } = {};
      products?.forEach(product => {
        productMap[product.id] = product.name;
      });
      
      const variantMap: { [key: string]: { name: string, productId: string } } = {};
      variants?.forEach(variant => {
        variantMap[variant.id] = { 
          name: variant.name,
          productId: variant.product_id
        };
      });
      
      // Procesar items para obtener montos pendientes por producto
      const productPendingMap: { [key: string]: number } = {};
      const productOrdersMap: { [key: string]: { [key: string]: Order } } = {};
      
      // Para cada pedido con saldo pendiente
      pendingOrders.forEach(order => {
        // Obtener porcentaje de deuda (cuánto del total está pendiente)
        const debtPercentage = order.total > 0 ? order.balance / order.total : 0;
        
        // Obtener items de este pedido
        const items = orderItems?.filter(item => item.order_id === order.id) || [];
        
        // Para cada item, calcular cuánto corresponde a la deuda
        items.forEach(item => {
          const productId = item.product_id;
          
          // Inicializar si es necesario
          if (!productPendingMap[productId]) {
            productPendingMap[productId] = 0;
          }
          
          if (!productOrdersMap[productId]) {
            productOrdersMap[productId] = {};
          }
          
          // Agregar la parte proporcional de la deuda
          const itemDebt = item.total * debtPercentage;
          productPendingMap[productId] += itemDebt;
          
          // Guardar este pedido asociado al producto (evitando duplicados)
          if (!productOrdersMap[productId][order.id]) {
            // Enriquecer los items con nombres para mostrar
            const enrichedItems = items.map(orderItem => ({
              ...orderItem,
              name: productMap[orderItem.product_id] || `Producto (${orderItem.product_id})`,
              variant: orderItem.variant_id ? variantMap[orderItem.variant_id]?.name || `Variante (${orderItem.variant_id})` : null
            }));
            
            // Asegurar que el status sea uno de los valores permitidos ('pending', 'completed', 'cancelled')
            let orderStatus: 'pending' | 'completed' | 'cancelled' = 'pending';
            if (order.status === 'completed') {
              orderStatus = 'completed';
            } else if (order.status === 'cancelled') {
              orderStatus = 'cancelled';
            }
            
            productOrdersMap[productId][order.id] = {
              id: order.id,
              clientId: order.client_id,
              clientName: clientMap[order.client_id] || "Cliente desconocido",
              date: order.date || "",
              status: orderStatus,
              items: enrichedItems,
              total: order.total,
              amountPaid: order.amount_paid,
              balance: order.balance
            };
          }
        });
      });
      
      // Convertir a array de ProductBalance
      const balances: ProductBalance[] = Object.keys(productPendingMap).map(productId => {
        return {
          id: productId,
          name: productMap[productId] || `Producto (${productId})`,
          pendingAmount: productPendingMap[productId],
          icon: <Package className="h-5 w-5 text-primary" />,
          orders: Object.values(productOrdersMap[productId])
        };
      });
      
      // Ordenar por monto pendiente (descendente)
      balances.sort((a, b) => b.pendingAmount - a.pendingAmount);
      
      setProductBalances(balances);
    } catch (error) {
      console.error("Error al cargar balances de productos:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenProductDetails = (product: ProductBalance) => {
    setSelectedProduct(product);
  };

  const handleCloseDialog = () => {
    setSelectedProduct(null);
  };

  if (isLoading) {
    return (
      <div className="flex justify-center p-6">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (productBalances.length === 0) {
    return (
      <div className="text-center p-4 bg-muted/20 rounded-lg">
        <p className="text-muted-foreground">No hay saldos pendientes por cobrar</p>
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
        {productBalances.map(product => (
          <Card 
            key={product.id}
            className="cursor-pointer hover:shadow-md transition-all duration-200 hover:bg-muted/20"
            onClick={() => handleOpenProductDetails(product)}
          >
            <CardContent className="p-3">
              <div className="flex items-center gap-2 mb-2">
                <div className="bg-primary/10 p-2 rounded-full">
                  {product.icon}
                </div>
                <div className="flex-1 truncate">
                  <div className="font-medium truncate">{product.name}</div>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </div>
              <Badge className="bg-primary/10 text-primary border-0 w-full justify-center py-1.5">
                ${product.pendingAmount.toFixed(2)}
              </Badge>
            </CardContent>
          </Card>
        ))}
      </div>

      {selectedProduct && (
        <Dialog open={!!selectedProduct} onOpenChange={handleCloseDialog}>
          <DialogContent className="max-w-4xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <div className="bg-primary/10 p-2 rounded-full">
                  {selectedProduct.icon}
                </div>
                {selectedProduct.name}
              </DialogTitle>
              <DialogDescription>
                Pedidos pendientes por cobrar: ${selectedProduct.pendingAmount.toFixed(2)}
              </DialogDescription>
            </DialogHeader>
            
            <div className="max-h-[60vh] overflow-y-auto pr-2">
              {selectedProduct.orders.length > 0 ? (
                <OrderCardList orders={selectedProduct.orders} />
              ) : (
                <div className="text-center p-6">
                  <p className="text-muted-foreground">No hay pedidos pendientes para este producto</p>
                </div>
              )}
            </div>
            
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="outline">Cerrar</Button>
              </DialogClose>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
};
