
import { Order, OrderItem } from '@/types';
import { supabase } from '@/lib/supabase';

// Mapear items de la API a OrderItems del frontend
export const mapApiItemsToOrderItems = (
  items: any[], 
  productMap: {[key: string]: {name: string, price: number}}, 
  variantMap: {[key: string]: {name: string, price: number}}
): OrderItem[] => {
  return items.map(item => {
    const productInfo = productMap[item.product_id] || { name: 'Producto', price: 0 };
    const variantInfo = item.variant_id ? variantMap[item.variant_id] || { name: 'Variante', price: 0 } : undefined;
    
    return {
      id: item.id,
      product_id: item.product_id,
      name: productInfo.name,
      variant: item.variant_id ? variantInfo.name : undefined,
      variant_id: item.variant_id || undefined,
      quantity: item.quantity,
      price: item.price || (variantInfo ? variantInfo.price : productInfo.price),
      total: item.total,
      is_paid: item.is_paid
    };
  });
};

// Obtener órdenes, clientes, items, productos y variantes
export const fetchOrdersData = async () => {
  console.log("Iniciando fetch de pedidos...");
  
  const { data: ordersData, error: ordersError } = await supabase
    .from('orders')
    .select('*')
    .order('created_at', { ascending: false });

  if (ordersError) {
    throw ordersError;
  }

  if (!ordersData || ordersData.length === 0) {
    return { ordersData: [], clientsData: [], orderItemsData: [], productsData: [], variantsData: [] };
  }

  console.log(`Obtenidos ${ordersData.length} pedidos`);
  
  const clientIds = [...new Set(ordersData.map(order => order.client_id))];
  const { data: clientsData, error: clientsError } = await supabase
    .from('clients')
    .select('id, name')
    .in('id', clientIds);

  if (clientsError) {
    throw clientsError;
  }

  const orderIds = ordersData.map(order => order.id);
  const { data: orderItemsData, error: orderItemsError } = await supabase
    .from('order_items')
    .select('*')
    .in('order_id', orderIds);

  if (orderItemsError) {
    throw orderItemsError;
  }
  
  console.log(`Obtenidos ${orderItemsData?.length || 0} items de pedidos`);

  let productsData = [];
  let variantsData = [];

  if (orderItemsData && orderItemsData.length > 0) {
    const productIds = orderItemsData.map(item => item.product_id);
    const { data: prods, error: productsError } = productIds.length > 0 
      ? await supabase
          .from('products')
          .select('id, name, price')
          .in('id', productIds)
      : { data: [], error: null };
      
    if (productsError) {
      throw productsError;
    }
    
    productsData = prods || [];
    console.log(`Obtenidos ${productsData.length} productos`);
    
    const variantIds = orderItemsData.filter(item => item.variant_id).map(item => item.variant_id);
    if (variantIds.length > 0) {
      const { data: vars, error: variantsError } = await supabase
        .from('product_variants')
        .select('id, name, price')
        .in('id', variantIds);
        
      if (variantsError) {
        throw variantsError;
      }
      
      variantsData = vars || [];
      console.log(`Obtenidas ${variantsData.length} variantes`);
    }
  }

  return {
    ordersData,
    clientsData: clientsData || [],
    orderItemsData: orderItemsData || [],
    productsData,
    variantsData
  };
};

// Actualizar el estado de pago de un producto
export const updateProductPaymentStatus = async (orderId: string, itemId: string, isPaid: boolean, newAmountPaid: number, newBalance: number) => {
  const { error } = await supabase
    .from('orders')
    .update({
      amount_paid: newAmountPaid,
      balance: newBalance
    })
    .eq('id', orderId);
    
  if (error) throw error;
  
  const { error: itemError } = await supabase
    .from('order_items')
    .update({
      is_paid: isPaid
    })
    .eq('id', itemId);
    
  if (itemError) {
    console.error("Error al actualizar estado de pago del item:", itemError);
    throw itemError;
  }
};

// Actualizar el estado de pago de todos los productos de un cliente
export const updateAllProductsPaymentStatus = async (clientOrders: Order[], isPaid: boolean) => {
  for (const order of clientOrders) {
    // Calcular la suma de todos los productos
    const orderTotal = order.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    
    for (const item of order.items) {
      const { error: itemError } = await supabase
        .from('order_items')
        .update({ is_paid: isPaid })
        .eq('id', item.id || '');
        
      if (itemError) throw itemError;
    }
    
    const newAmountPaid = isPaid ? orderTotal : 0;
    const newBalance = isPaid ? 0 : orderTotal;
    
    const { error } = await supabase
      .from('orders')
      .update({ 
        amount_paid: newAmountPaid,
        balance: newBalance,
        total: orderTotal // Asegurar que el total sea correcto
      })
      .eq('id', order.id);
      
    if (error) throw error;
  }
};

// Eliminar una orden
export const deleteOrder = async (orderId: string) => {
  const { error: itemsError } = await supabase
    .from('order_items')
    .delete()
    .eq('order_id', orderId);
  
  if (itemsError) throw itemsError;
  
  const { error: orderError } = await supabase
    .from('orders')
    .delete()
    .eq('id', orderId);
    
  if (orderError) throw orderError;
};

// Actualizar el total de una orden
export const updateOrderTotal = async (orderId: string) => {
  const { data: items, error: itemsError } = await supabase
    .from('order_items')
    .select('*')
    .eq('order_id', orderId);
  
  if (itemsError) throw itemsError;
  
  const productIds = items?.map(item => item.product_id) || [];
  let productsData: any[] = [];
  let variantsData: any[] = [];
  
  if (productIds.length > 0) {
    const { data: prods, error: productsError } = await supabase
      .from('products')
      .select('id, name, price')
      .in('id', productIds);
      
    if (productsError) throw productsError;
    productsData = prods || [];
    
    const variantIds = items?.filter(item => item.variant_id).map(item => item.variant_id) || [];
    if (variantIds.length > 0) {
      const { data: vars, error: variantsError } = await supabase
        .from('product_variants')
        .select('id, name, price')
        .in('id', variantIds);
        
      if (variantsError) throw variantsError;
      variantsData = vars || [];
    }
  }
  
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
  
  // Calcular el total real basado en price * quantity para cada item
  const newTotal = items?.reduce((sum, item) => {
    const itemTotal = (item.price || 0) * (item.quantity || 1);
    return sum + itemTotal;
  }, 0) || 0;
  
  const { data: currentOrder, error: orderError } = await supabase
    .from('orders')
    .select('amount_paid')
    .eq('id', orderId)
    .maybeSingle();
  
  if (orderError) throw orderError;
  
  const amountPaid = currentOrder?.amount_paid || 0;
  const newBalance = Math.max(0, newTotal - amountPaid);
  
  const { error: updateError } = await supabase
    .from('orders')
    .update({ 
      total: newTotal,
      balance: newBalance
    })
    .eq('id', orderId);
    
  if (updateError) throw updateError;
  
  return {
    items,
    productMap,
    variantMap,
    newTotal,
    amountPaid,
    newBalance
  };
};

// Actualizar un producto
export const updateProductQuantity = async (itemId: string, newQuantity: number) => {
  const { data: itemData, error: itemError } = await supabase
    .from('order_items')
    .select('price, is_paid')
    .eq('id', itemId)
    .single();
  
  if (itemError) throw itemError;
  
  const price = itemData?.price || 0;
  const total = price * newQuantity;
  
  const { error } = await supabase
    .from('order_items')
    .update({ 
      quantity: newQuantity,
      total: total
    })
    .eq('id', itemId);
    
  if (error) throw error;
  
  return { price, total };
};

// Eliminar un producto de una orden
export const deleteProductFromOrder = async (itemId: string) => {
  const { error } = await supabase
    .from('order_items')
    .delete()
    .eq('id', itemId);
    
  if (error) throw error;
};

// Guardar una nueva orden
export const saveNewOrder = async (order: Order) => {
  // Calcular el total basado en los precios y cantidades
  let total = 0;
  for (const item of order.items) {
    total += item.price * item.quantity;
  }
  
  // Guardar el pedido en la base de datos
  const { data: newOrder, error: orderError } = await supabase
    .from('orders')
    .insert({
      client_id: order.clientId,
      date: new Date().toISOString().split('T')[0],
      status: 'pending',
      total: total,
      amount_paid: 0, // Por defecto, el pedido no está pagado
      balance: total
    })
    .select('id')
    .single();
    
  if (orderError || !newOrder) {
    throw orderError || new Error("Error al crear la orden");
  }
  
  // Crear los items del pedido
  const orderItems = order.items.map(item => ({
    order_id: newOrder.id,
    product_id: item.product_id,
    variant_id: item.variant_id || null,
    quantity: item.quantity,
    price: item.price,
    total: item.price * item.quantity,
    is_paid: false
  }));
  
  const { error: itemsError } = await supabase
    .from('order_items')
    .insert(orderItems);
    
  if (itemsError) {
    // Si hay error en los items, eliminar el pedido creado
    await supabase.from('orders').delete().eq('id', newOrder.id);
    throw itemsError;
  }
  
  return newOrder.id;
};
