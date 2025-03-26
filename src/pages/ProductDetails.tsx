
import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Package, DollarSign, CheckCircle, Search, Edit, Trash, X, Plus, Check, Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { getProductIcon } from "@/services/productIconService";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { SwipeActionButton } from "@/components/ui/swipe-action-button";
import { useSwipe } from "@/hooks/use-swipe";

interface ProductDetailParams {
  productId: string;
}

interface OrderDetail {
  id: string;
  clientName: string;
  quantity: number;
  isPaid: boolean;
  orderId: string;
  balance: number;
  clientId: string; 
  variant?: string;
  variantId?: string;
}

interface ClientOrders {
  clientName: string;
  clientId: string;
  orderItems: {
    id: string;
    orderId: string;
    quantity: number;
    isPaid: boolean;
    variant?: string;
    variantId?: string;
  }[];
  totalQuantity: number;
  balance: number;
}

interface EditingItem {
  itemId: string;
  quantity: number;
}

const ProductDetails = () => {
  const { productId } = useParams<keyof ProductDetailParams>() as ProductDetailParams;
  const navigate = useNavigate();
  const [productName, setProductName] = useState('');
  const [orderDetails, setOrderDetails] = useState<OrderDetail[]>([]);
  const [clientOrders, setClientOrders] = useState<ClientOrders[]>([]);
  const [filteredClients, setFilteredClients] = useState<ClientOrders[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [editingItem, setEditingItem] = useState<EditingItem | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [swipeStates, setSwipeStates] = useState<{[key: string]: number}>({});
  const { toast } = useToast();

  // Referencias para elementos con swipe
  const itemRefs = useRef<{[key: string]: HTMLDivElement | null}>({});

  const registerItemRef = (key: string, ref: HTMLDivElement | null) => {
    if (itemRefs.current) {
      itemRefs.current[key] = ref;
    }
  };

  useEffect(() => {
    if (productId) {
      fetchProductDetails();
    }
  }, [productId]);

  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredClients(clientOrders);
    } else {
      const filtered = clientOrders.filter(client => 
        client.clientName.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredClients(filtered);
    }
  }, [searchQuery, clientOrders]);

  // Restablecer todas las posiciones de swipe cuando cambia el elemento en edición
  useEffect(() => {
    if (editingItem) {
      setSwipeStates({});
    }
  }, [editingItem]);

  const fetchProductDetails = async () => {
    setIsLoading(true);
    try {
      // Fetch product name
      const { data: product, error: productError } = await supabase
        .from('products')
        .select('name')
        .eq('id', productId)
        .single();

      if (productError) throw productError;
      setProductName(product?.name || '');

      // Fetch order details for this product
      const { data: orderItems, error: orderItemsError } = await supabase
        .from('order_items')
        .select('id, order_id, quantity, is_paid, variant_id')
        .eq('product_id', productId);

      if (orderItemsError) throw orderItemsError;

      if (orderItems && orderItems.length > 0) {
        const orderIds = orderItems.map(item => item.order_id);
        
        // Fetch orders with client info
        const { data: orders, error: ordersError } = await supabase
          .from('orders')
          .select('id, client_id, amount_paid, total, balance')
          .in('id', orderIds);

        if (ordersError) throw ordersError;

        if (orders && orders.length > 0) {
          const clientIds = orders.map(order => order.client_id);
          
          // Fetch client info
          const { data: clients, error: clientsError } = await supabase
            .from('clients')
            .select('id, name')
            .in('id', clientIds);

          if (clientsError) throw clientsError;

          // Fetch variants if needed
          const variantIds = orderItems
            .filter(item => item.variant_id)
            .map(item => item.variant_id);
          
          let variants: any[] = [];
          if (variantIds.length > 0) {
            const { data: variantsData, error: variantsError } = await supabase
              .from('product_variants')
              .select('id, name')
              .in('id', variantIds);
            
            if (variantsError) throw variantsError;
            variants = variantsData || [];
          }

          // Combine all data
          const details: OrderDetail[] = orderItems.map(item => {
            const order = orders.find(o => o.id === item.order_id);
            const client = clients?.find(c => c.id === order?.client_id);
            const variant = item.variant_id ? variants.find(v => v.id === item.variant_id) : null;
            
            return {
              id: item.id,
              orderId: item.order_id,
              clientName: client?.name || 'Cliente desconocido',
              clientId: client?.id || '', 
              quantity: Number(item.quantity),
              isPaid: item.is_paid === true,
              balance: order?.balance || 0,
              variant: variant?.name,
              variantId: item.variant_id
            };
          });

          setOrderDetails(details);
          
          // Agrupar por cliente
          const clientOrdersMap: { [clientId: string]: ClientOrders } = {};
          
          details.forEach(detail => {
            if (!detail.clientId) return;
            
            if (!clientOrdersMap[detail.clientId]) {
              clientOrdersMap[detail.clientId] = {
                clientId: detail.clientId,
                clientName: detail.clientName,
                orderItems: [],
                totalQuantity: 0,
                balance: 0
              };
            }
            
            clientOrdersMap[detail.clientId].orderItems.push({
              id: detail.id,
              orderId: detail.orderId,
              quantity: detail.quantity,
              isPaid: detail.isPaid,
              variant: detail.variant,
              variantId: detail.variantId
            });
            
            clientOrdersMap[detail.clientId].totalQuantity += detail.quantity;
            if (!detail.isPaid) {
              clientOrdersMap[detail.clientId].balance += detail.balance;
            }
          });
          
          const groupedClients = Object.values(clientOrdersMap);
          setClientOrders(groupedClients);
          setFilteredClients(groupedClients);
        }
      }
    } catch (error) {
      console.error('Error fetching product details:', error);
      toast({
        title: "Error",
        description: "No se pudieron cargar los detalles del producto",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handlePaymentToggle = async (client: ClientOrders, isPaid: boolean) => {
    try {
      setIsSaving(true);
      // Actualizar todos los items de este cliente para este producto
      for (const item of client.orderItems) {
        // Actualizar el estado de pago del item
        const { error: itemError } = await supabase
          .from('order_items')
          .update({ is_paid: isPaid })
          .eq('id', item.id);

        if (itemError) throw itemError;

        // Obtener todos los items de esta orden para recalcular el total pagado
        const { data: orderItems, error: itemsError } = await supabase
          .from('order_items')
          .select('price, quantity, is_paid')
          .eq('order_id', item.orderId);

        if (itemsError) throw itemsError;

        // Obtener el pedido actual
        const { data: order, error: orderError } = await supabase
          .from('orders')
          .select('total')
          .eq('id', item.orderId)
          .single();

        if (orderError) throw orderError;

        // Calcular el nuevo monto pagado basado en todos los items pagados
        let newAmountPaid = 0;
        orderItems?.forEach(orderItem => {
          if (orderItem.is_paid) {
            newAmountPaid += (orderItem.price || 0) * (orderItem.quantity || 0);
          }
        });

        // Redondear para evitar problemas de precisión
        newAmountPaid = Math.round(newAmountPaid * 100) / 100;
        const newBalance = Math.max(0, order.total - newAmountPaid);

        // Actualizar el pedido con el nuevo monto pagado
        const { error: updateError } = await supabase
          .from('orders')
          .update({ 
            amount_paid: newAmountPaid,
            balance: newBalance
          })
          .eq('id', item.orderId);

        if (updateError) throw updateError;
      }

      // Actualizar estado local
      setClientOrders(prevClients => {
        const updated = prevClients.map(c => 
          c.clientId === client.clientId 
            ? { 
                ...c, 
                orderItems: c.orderItems.map(item => ({ ...item, isPaid })),
                balance: isPaid ? 0 : c.balance
              } 
            : c
        );
        setFilteredClients(updated.filter(c => 
          c.clientName.toLowerCase().includes(searchQuery.toLowerCase())
        ));
        return updated;
      });

      toast({
        title: isPaid ? "Marcado como pagado" : "Marcado como pendiente",
        description: `Pedido de ${client.clientName} ${isPaid ? "pagado" : "pendiente"}`,
        variant: isPaid ? "default" : "destructive"
      });
    } catch (error) {
      console.error('Error updating payment status:', error);
      toast({
        title: "Error",
        description: "No se pudo actualizar el estado de pago",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleEditItem = (itemId: string, currentQuantity: number) => {
    // Cerrar cualquier swipe abierto
    setSwipeStates({});
    
    // Establecer el ítem en edición
    setEditingItem({
      itemId,
      quantity: currentQuantity
    });
  };

  const handleCancelEdit = () => {
    setEditingItem(null);
  };

  const handleQuantityChange = (newQuantity: number) => {
    if (!editingItem) return;
    
    // Asegurar que la cantidad sea al menos 1
    const validQuantity = Math.max(1, newQuantity);
    
    setEditingItem({
      ...editingItem,
      quantity: validQuantity
    });
  };

  const handleSaveItemChanges = async () => {
    if (!editingItem) return;
    
    try {
      setIsSaving(true);
      
      // Actualizar la cantidad en la base de datos
      const { error } = await supabase
        .from('order_items')
        .update({ quantity: editingItem.quantity })
        .eq('id', editingItem.itemId);
      
      if (error) throw error;
      
      // Actualizar los totales de la orden
      const item = orderDetails.find(item => item.id === editingItem.itemId);
      if (item) {
        // Obtener precio del item
        const { data: itemData, error: itemError } = await supabase
          .from('order_items')
          .select('price')
          .eq('id', editingItem.itemId)
          .single();
        
        if (itemError) throw itemError;
        
        // Obtener todos los items de esta orden para recalcular el total
        const { data: orderItems, error: itemsError } = await supabase
          .from('order_items')
          .select('price, quantity, is_paid')
          .eq('order_id', item.orderId);
        
        if (itemsError) throw itemsError;
        
        // Calcular nuevos totales
        let newTotal = 0;
        let newAmountPaid = 0;
        
        orderItems?.forEach(orderItem => {
          const itemTotal = (orderItem.price || 0) * (
            orderItem.id === editingItem.itemId 
              ? editingItem.quantity 
              : (orderItem.quantity || 0)
          );
          newTotal += itemTotal;
          
          if (orderItem.is_paid) {
            const paidAmount = (orderItem.price || 0) * (
              orderItem.id === editingItem.itemId 
                ? editingItem.quantity 
                : (orderItem.quantity || 0)
            );
            newAmountPaid += paidAmount;
          }
        });
        
        // Redondear para evitar problemas de precisión
        newTotal = Math.round(newTotal * 100) / 100;
        newAmountPaid = Math.round(newAmountPaid * 100) / 100;
        const newBalance = Math.max(0, newTotal - newAmountPaid);
        
        // Actualizar orden
        const { error: updateError } = await supabase
          .from('orders')
          .update({
            total: newTotal,
            amount_paid: newAmountPaid,
            balance: newBalance
          })
          .eq('id', item.orderId);
        
        if (updateError) throw updateError;
        
        // Actualizar item
        const { error: itemUpdateError } = await supabase
          .from('order_items')
          .update({
            total: itemData.price * editingItem.quantity
          })
          .eq('id', editingItem.itemId);
        
        if (itemUpdateError) throw itemUpdateError;
      }
      
      // Actualizar estado local
      await fetchProductDetails();
      
      // Cerrar modo edición
      setEditingItem(null);
      
      toast({
        title: "Cambios guardados",
        description: "La cantidad ha sido actualizada correctamente",
      });
    } catch (error) {
      console.error("Error al guardar cambios:", error);
      toast({
        title: "Error",
        description: "No se pudieron guardar los cambios",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteItem = async (itemId: string, orderId: string) => {
    try {
      setIsSaving(true);
      
      // Obtener información del item actual
      const { data: itemData, error: itemError } = await supabase
        .from('order_items')
        .select('price, quantity, is_paid')
        .eq('id', itemId)
        .single();
      
      if (itemError) throw itemError;
      
      // Eliminar el item
      const { error } = await supabase
        .from('order_items')
        .delete()
        .eq('id', itemId);
      
      if (error) throw error;
      
      // Recalcular totales de la orden
      const { data: remainingItems, error: itemsError } = await supabase
        .from('order_items')
        .select('price, quantity, is_paid')
        .eq('order_id', orderId);
      
      if (itemsError) throw itemsError;
      
      // Calcular nuevos totales
      let newTotal = 0;
      let newAmountPaid = 0;
      
      remainingItems?.forEach(item => {
        const itemTotal = (item.price || 0) * (item.quantity || 0);
        newTotal += itemTotal;
        
        if (item.is_paid) {
          newAmountPaid += itemTotal;
        }
      });
      
      // Redondear para evitar problemas de precisión
      newTotal = Math.round(newTotal * 100) / 100;
      newAmountPaid = Math.round(newAmountPaid * 100) / 100;
      const newBalance = Math.max(0, newTotal - newAmountPaid);
      
      // Actualizar orden
      const { error: updateError } = await supabase
        .from('orders')
        .update({
          total: newTotal,
          amount_paid: newAmountPaid,
          balance: newBalance
        })
        .eq('id', orderId);
      
      if (updateError) throw updateError;
      
      // Actualizar estado local
      await fetchProductDetails();
      
      toast({
        title: "Variante eliminada",
        description: "La variante ha sido eliminada correctamente",
      });
    } catch (error) {
      console.error("Error al eliminar variante:", error);
      toast({
        title: "Error",
        description: "No se pudo eliminar la variante",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleSwipe = (itemId: string, swipeX: number) => {
    setSwipeStates(prev => ({
      ...prev,
      [itemId]: swipeX
    }));
  };

  const ProductIcon = getProductIcon(productName);

  const getIconColor = (productName: string) => {
    // Asignar colores basados en el nombre del producto
    const colors = ['text-blue-500', 'text-green-500', 'text-purple-500', 'text-orange-500', 'text-red-500', 'text-pink-500', 'text-amber-500', 'text-teal-500'];
    let hash = 0;
    for (let i = 0; i < productName.length; i++) {
      hash = productName.charCodeAt(i) + ((hash << 5) - hash);
    }
    const index = Math.abs(hash) % colors.length;
    return colors[index];
  };

  const iconColor = getIconColor(productName);

  // Componente para el ítem de variante con swipe
  const VariantItem = ({ item, clientId, isPaid }: { item: any, clientId: string, isPaid: boolean }) => {
    const itemId = item.id;
    const swipeX = swipeStates[itemId] || 0;
    const isEditing = editingItem?.itemId === itemId;
    
    // Hook para swipe
    const { swipeX: localSwipeX, resetSwipe, getMouseProps, getTouchProps } = useSwipe({
      maxSwipe: -70,
      disabled: isPaid || isEditing,
      onSwipeEnd: (completed) => {
        if (!completed) {
          resetSwipe();
        } else {
          handleSwipe(itemId, localSwipeX);
        }
      }
    });
    
    // Determinar si aplicamos las props de swipe
    const swipeProps = (!isPaid && !isEditing) ? {
      ...getMouseProps(),
      ...getTouchProps()
    } : {};
    
    // Usar swipe local si está activo
    const effectiveSwipeX = localSwipeX !== 0 ? localSwipeX : swipeX;
    
    return (
      <div 
        ref={(ref) => registerItemRef(itemId, ref)}
        className="relative overflow-hidden mb-2 last:mb-0"
      >
        {/* Botones de acción en el fondo */}
        {!isEditing && (
          <div 
            className="absolute inset-y-0 right-0 flex items-stretch h-full overflow-hidden"
            style={{ 
              width: '70px',
              zIndex: 1
            }}
          >
            <div className="flex-1 flex items-stretch h-full">
              <SwipeActionButton 
                variant="warning"
                icon={<Edit className="h-4 w-4" />}
                onClick={() => handleEditItem(itemId, item.quantity)}
                disabled={isSaving || isPaid}
                label="Editar variante"
              />
            </div>
            <div className="flex-1 flex items-stretch h-full">
              <SwipeActionButton 
                variant="destructive"
                icon={<Trash className="h-4 w-4" />}
                onClick={() => handleDeleteItem(itemId, item.orderId)}
                disabled={isSaving}
                label="Eliminar variante"
              />
            </div>
          </div>
        )}
        
        {/* Contenido del ítem */}
        <div 
          {...swipeProps}
          className={`transition-transform rounded-lg
                    ${!isPaid && !isEditing ? 'cursor-grab active:cursor-grabbing' : ''}
                    ${isEditing ? 'bg-primary/5 border border-primary/30' : 'bg-gray-50 dark:bg-gray-800'}`}
          style={{ 
            transform: `translateX(${isEditing ? 0 : effectiveSwipeX}px)`,
            transition: 'transform 0.3s ease-out',
            zIndex: isEditing ? 20 : (effectiveSwipeX === 0 ? 10 : 5)
          }}
        >
          {isEditing ? (
            <div className="p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium">{item.variant || productName}</span>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <Button 
                    variant="outline" 
                    size="icon" 
                    className="h-8 w-8 rounded-full"
                    onClick={() => handleQuantityChange(editingItem.quantity - 1)}
                    disabled={isSaving || editingItem.quantity <= 1}
                    aria-label="Reducir cantidad"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                  <Input
                    type="number"
                    value={editingItem.quantity}
                    onChange={(e) => handleQuantityChange(parseInt(e.target.value) || 1)}
                    className="w-12 h-8 mx-1 text-center p-0"
                    disabled={isSaving}
                    aria-label="Cantidad"
                    min="1"
                  />
                  <Button 
                    variant="outline" 
                    size="icon" 
                    className="h-8 w-8 rounded-full"
                    onClick={() => handleQuantityChange(editingItem.quantity + 1)}
                    disabled={isSaving}
                    aria-label="Aumentar cantidad"
                  >
                    <Plus className="h-3 w-3" />
                  </Button>
                </div>
                
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="h-8 px-2 rounded-full"
                    onClick={handleCancelEdit}
                    disabled={isSaving}
                  >
                    <X className="h-4 w-4 mr-1" />
                    Cancelar
                  </Button>
                  <Button 
                    variant="default" 
                    size="sm" 
                    className="h-8 px-3 rounded-full"
                    onClick={handleSaveItemChanges}
                    disabled={isSaving}
                  >
                    {isSaving ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-1" />
                    ) : (
                      <Check className="h-4 w-4 mr-1" />
                    )}
                    Guardar
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-3 flex justify-between items-center">
              <div>
                <div className="flex items-center gap-2">
                  {item.variant ? (
                    <Badge variant={isPaid ? "outline" : "secondary"} className={`font-normal ${isPaid ? 'border-green-200 bg-green-50 text-green-700' : ''}`}>
                      {item.variant}
                    </Badge>
                  ) : (
                    <span className="font-medium">{productName}</span>
                  )}
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  Cantidad: {item.quantity}
                </div>
              </div>
              <div className={`text-sm ${isPaid ? 'text-green-600' : 'text-foreground'}`}>
                {isPaid ? 'Pagado' : 'Pendiente'}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button 
            variant="outline" 
            size="icon" 
            onClick={() => navigate(-1)}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex items-center gap-2">
            <div className={`bg-primary/10 p-2 rounded-full ${iconColor}`}>
              <ProductIcon className="h-5 w-5" />
            </div>
            <h1 className="text-2xl font-bold">{productName}</h1>
          </div>
          <div className="ml-auto">
            <Button 
              variant="ghost" 
              size="icon"
              className="rounded-full"
              onClick={() => setSearchOpen(!searchOpen)}
            >
              <Search className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {searchOpen && (
          <div className="animate-in fade-in slide-in-from-top duration-300">
            <Input
              placeholder="Buscar cliente..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full"
            />
          </div>
        )}

        <div>
          <h2 className="text-xl font-semibold mb-4">Clientes con este producto</h2>
          
          {isLoading ? (
            <div className="text-center py-8">Cargando...</div>
          ) : filteredClients.length > 0 ? (
            <div className="space-y-3">
              {filteredClients.map(client => {
                const allItemsPaid = client.orderItems.every(item => item.isPaid);
                
                return (
                  <div key={client.clientId} className="p-4 border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-all dark:border-gray-700 dark:bg-gray-800">
                    <div className="flex justify-between items-center">
                      <span className="font-medium flex items-center gap-2">
                        {client.clientName}
                        {allItemsPaid && (
                          <CheckCircle className="h-4 w-4 text-green-500" />
                        )}
                      </span>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="flex items-center gap-1 bg-blue-50 dark:bg-blue-900/30">
                          <Package className="h-3 w-3" />
                          <span>{client.totalQuantity}</span>
                        </Badge>
                        {!allItemsPaid && (
                          <Badge variant="outline" className="flex items-center gap-1 bg-blue-50 dark:bg-blue-900/30">
                            <DollarSign className="h-3 w-3" />
                            <span>{client.balance}</span>
                          </Badge>
                        )}
                        <div 
                          className="relative inline-flex h-4 w-8 cursor-pointer rounded-full bg-gray-200 transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary dark:bg-gray-700" 
                          onClick={() => handlePaymentToggle(client, !allItemsPaid)}
                        >
                          <span
                            className={`${
                              allItemsPaid ? 'translate-x-4 bg-primary' : 'translate-x-0 bg-gray-400'
                            } pointer-events-none inline-block h-4 w-4 transform rounded-full shadow-lg transition duration-200 ease-in-out`}
                          />
                        </div>
                      </div>
                    </div>
                    
                    {client.orderItems.length > 0 && (
                      <div className="mt-3 pl-2">
                        <Separator className="my-2" />
                        <div className="text-sm">
                          {client.orderItems.map((item) => (
                            <VariantItem 
                              key={item.id} 
                              item={item} 
                              clientId={client.clientId}
                              isPaid={item.isPaid} 
                            />
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              {searchQuery ? "No se encontraron clientes" : "No hay pedidos para este producto"}
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
};

export default ProductDetails;
