
import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { supabase } from "@/lib/supabase";
import { 
  Card, 
  CardHeader, 
  CardContent, 
  CardTitle, 
  CardDescription, 
  CardFooter 
} from "@/components/ui/card";
import { 
  ArrowLeft, 
  ShoppingBag, 
  Users, 
  DollarSign, 
  Clock, 
  CheckCircle, 
  AlertCircle, 
  BarChart4,
  Loader2,
  Star
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getProductIcon } from "@/services/productIconService";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

type ProductDetailWithOrders = {
  id: string;
  name: string;
  description: string;
  image_url?: string;
  variants: {
    id: string;
    name: string;
    price: number;
    order_count?: number;
  }[];
  total_orders: number;
  total_revenue: number;
  pending_payment: number;
  payment_rate: number;
};

type ProductOrder = {
  id: string;
  client: {
    id: string;
    name: string;
    email: string;
    phone?: string;
    image_url?: string;
  };
  date: string;
  status: string;
  items: {
    variant_name: string;
    quantity: number;
    price: number;
  }[];
  total: number;
  balance?: number;
};

const ProductDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [product, setProduct] = useState<ProductDetailWithOrders | null>(null);
  const [orders, setOrders] = useState<ProductOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingOrders, setIsLoadingOrders] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");

  useEffect(() => {
    const fetchProductDetails = async () => {
      if (!id) return;
      
      setIsLoading(true);
      try {
        // Obtener detalles del producto y sus variantes
        const { data: productData, error: productError } = await supabase
          .from('products')
          .select('*, variants:product_variants(*)')
          .eq('id', id)
          .single();
          
        if (productError) throw productError;
        
        // Obtener estadísticas de ventas por variante
        const { data: orderItems, error: itemsError } = await supabase
          .from('order_items')
          .select('*, orders(*), product_variant:product_variants!inner(*)')
          .eq('product_id', id);
          
        if (itemsError) throw itemsError;
        
        // Calcular estadísticas generales
        const totalOrders = new Set(orderItems.map(item => item.order_id)).size;
        const totalRevenue = orderItems.reduce((sum, item) => sum + (parseFloat(item.price) * item.quantity), 0);
        
        // Calcular pagos pendientes
        const pendingPayment = orderItems.reduce((sum, item) => {
          const order = item.orders;
          if (order && order.status !== 'completed') {
            // Calculamos la parte proporcional del balance pendiente para este item
            const orderTotal = orderItems
              .filter(oi => oi.order_id === item.order_id)
              .reduce((t, oi) => t + (parseFloat(oi.price) * oi.quantity), 0);
            
            const itemPercentage = (parseFloat(item.price) * item.quantity) / orderTotal;
            const itemPending = parseFloat(order.balance) * itemPercentage;
            
            return sum + itemPending;
          }
          return sum;
        }, 0);
        
        // Tasa de pago (porcentaje pagado)
        const paymentRate = totalRevenue > 0 ? 
          ((totalRevenue - pendingPayment) / totalRevenue) * 100 : 0;
        
        // Sumar estadísticas por variante
        const variantsWithStats = productData.variants.map((variant: any) => {
          const variantOrders = orderItems.filter(item => 
            item.variant_id === variant.id
          );
          
          const orderCount = new Set(variantOrders.map(item => item.order_id)).size;
          
          return {
            ...variant,
            order_count: orderCount
          };
        });
        
        // Construir objeto completo
        const productWithStats: ProductDetailWithOrders = {
          ...productData,
          variants: variantsWithStats,
          total_orders: totalOrders,
          total_revenue: totalRevenue,
          pending_payment: pendingPayment,
          payment_rate: paymentRate
        };
        
        setProduct(productWithStats);
      } catch (error) {
        console.error("Error fetching product details:", error);
      } finally {
        setIsLoading(false);
      }
    };
    
    const fetchOrders = async () => {
      if (!id) return;
      
      setIsLoadingOrders(true);
      try {
        // Obtener pedidos para este producto
        const { data: orderItems, error: itemsError } = await supabase
          .from('order_items')
          .select(`
            *,
            orders(*),
            product_variant:product_variants(*),
            client:orders(client:clients(*))
          `)
          .eq('product_id', id)
          .order('created_at', { ascending: false });
          
        if (itemsError) throw itemsError;
        
        // Agrupar por orden
        const ordersMap = new Map<string, any>();
        
        orderItems.forEach(item => {
          const orderId = item.order_id;
          const order = item.orders;
          const client = item.client?.[0]?.client;
          
          if (!ordersMap.has(orderId)) {
            ordersMap.set(orderId, {
              id: orderId,
              client: client,
              date: order.created_at,
              status: order.status,
              items: [],
              total: 0,
              balance: order.balance
            });
          }
          
          const currentOrder = ordersMap.get(orderId);
          
          currentOrder.items.push({
            variant_name: item.product_variant.name,
            quantity: item.quantity,
            price: parseFloat(item.price)
          });
          
          currentOrder.total += parseFloat(item.price) * item.quantity;
        });
        
        setOrders(Array.from(ordersMap.values()));
      } catch (error) {
        console.error("Error fetching orders:", error);
      } finally {
        setIsLoadingOrders(false);
      }
    };
    
    if (id) {
      fetchProductDetails();
      fetchOrders();
    }
  }, [id]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-green-500">Completado</Badge>;
      case 'pending':
        return <Badge className="bg-amber-500">Pendiente</Badge>;
      case 'processing':
        return <Badge className="bg-blue-500">Procesando</Badge>;
      default:
        return <Badge className="bg-gray-500">Desconocido</Badge>;
    }
  };

  if (isLoading) {
    return (
      <AppLayout>
        <div className="flex justify-center items-center h-[50vh]">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  if (!product) {
    return (
      <AppLayout>
        <div className="text-center py-12">
          <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
          <h2 className="text-2xl font-bold">Producto no encontrado</h2>
          <p className="text-muted-foreground mb-4">No se encontró el producto solicitado</p>
          <Button onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4 mr-2" /> Volver
          </Button>
        </div>
      </AppLayout>
    );
  }
  
  const IconComponent = getProductIcon(product.name);

  return (
    <AppLayout>
      <div className="mb-6">
        <Button 
          variant="ghost" 
          size="sm" 
          className="mb-2" 
          onClick={() => navigate(-1)}
        >
          <ArrowLeft className="h-4 w-4 mr-2" /> Volver
        </Button>
        
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 bg-primary/10 rounded-full flex items-center justify-center">
              <IconComponent className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">{product.name}</h1>
              <p className="text-muted-foreground">{product.description || "Sin descripción"}</p>
            </div>
          </div>
          
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => navigate(`/products?edit=${product.id}`)}>
              Editar producto
            </Button>
          </div>
        </div>
      </div>
      
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-4">
          <TabsTrigger value="overview">Resumen</TabsTrigger>
          <TabsTrigger value="orders">Pedidos</TabsTrigger>
          <TabsTrigger value="variants">Variantes</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                  <CardTitle className="text-sm font-medium">Pedidos</CardTitle>
                  <ShoppingBag className="h-4 w-4 text-muted-foreground" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{product.total_orders}</div>
                <p className="text-xs text-muted-foreground">Total de pedidos</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                  <CardTitle className="text-sm font-medium">Ventas</CardTitle>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">${product.total_revenue.toFixed(2)}</div>
                <p className="text-xs text-muted-foreground">Valor total de ventas</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                  <CardTitle className="text-sm font-medium">Pendiente</CardTitle>
                  <Clock className="h-4 w-4 text-muted-foreground" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">${product.pending_payment.toFixed(2)}</div>
                <p className="text-xs text-muted-foreground">Saldo por cobrar</p>
              </CardContent>
            </Card>
          </div>
          
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Progreso de Pagos</CardTitle>
              <CardDescription>
                {product.payment_rate.toFixed(1)}% del monto total ha sido cobrado
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Progress value={product.payment_rate} className="h-2" />
                <div className="grid grid-cols-2 text-xs text-muted-foreground">
                  <div>${(product.total_revenue - product.pending_payment).toFixed(2)} cobrado</div>
                  <div className="text-right">${product.pending_payment.toFixed(2)} pendiente</div>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Resumen de Variantes</CardTitle>
              <CardDescription>
                Comparación de pedidos por variante
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {product.variants.map((variant) => (
                  <div key={variant.id} className="space-y-1">
                    <div className="flex justify-between">
                      <span className="text-sm font-medium">{variant.name}</span>
                      <span className="text-sm">${variant.price.toFixed(2)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Progress 
                        value={product.total_orders > 0 ? (variant.order_count || 0) / product.total_orders * 100 : 0} 
                        className="h-2" 
                      />
                      <span className="text-xs text-muted-foreground min-w-[3rem] text-right">
                        {variant.order_count || 0} {variant.order_count === 1 ? 'pedido' : 'pedidos'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="orders">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Pedidos ({orders.length})</CardTitle>
              <CardDescription>
                Todos los pedidos que incluyen este producto
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {isLoadingOrders ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : orders.length === 0 ? (
                <div className="text-center py-12">
                  <ShoppingBag className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
                  <h3 className="text-lg font-medium">Sin pedidos</h3>
                  <p className="text-muted-foreground">No hay pedidos registrados para este producto</p>
                </div>
              ) : (
                <ScrollArea className="h-[500px]">
                  <div className="divide-y">
                    {orders.map((order) => (
                      <div key={order.id} className="p-4 hover:bg-muted/50 transition-colors">
                        <div className="flex justify-between items-start">
                          <div className="flex items-center gap-3">
                            <Avatar>
                              <AvatarFallback>{order.client?.name?.charAt(0) || "C"}</AvatarFallback>
                              {order.client?.image_url && (
                                <AvatarImage src={order.client.image_url} alt={order.client?.name} />
                              )}
                            </Avatar>
                            <div>
                              <h4 className="font-medium">{order.client?.name || "Cliente desconocido"}</h4>
                              <div className="flex items-center text-xs text-muted-foreground gap-2">
                                <span>{new Date(order.date).toLocaleDateString()}</span>
                                <span>•</span>
                                <span>ID: {order.id.slice(0, 8)}</span>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {getStatusBadge(order.status)}
                            <div className="text-sm font-medium text-right">
                              ${order.total.toFixed(2)}
                            </div>
                          </div>
                        </div>
                        
                        <div className="mt-3 pl-12">
                          <div className="text-xs font-medium text-muted-foreground mb-1">Productos ordenados:</div>
                          <div className="space-y-1">
                            {order.items.map((item, idx) => (
                              <div key={idx} className="text-sm flex justify-between">
                                <span>
                                  {item.quantity}x {item.variant_name}
                                </span>
                                <span className="font-medium">${(item.price * item.quantity).toFixed(2)}</span>
                              </div>
                            ))}
                          </div>
                          
                          {order.balance && parseFloat(order.balance.toString()) > 0 && (
                            <div className="mt-2 flex justify-between text-sm">
                              <span className="text-amber-600 font-medium">Saldo pendiente:</span>
                              <span className="text-amber-600 font-medium">${parseFloat(order.balance.toString()).toFixed(2)}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="variants" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Variantes ({product.variants.length})</CardTitle>
              <CardDescription>
                Todas las variantes disponibles del producto
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {product.variants.map((variant) => (
                  <Card key={variant.id}>
                    <CardHeader className="p-4 pb-2">
                      <div className="flex justify-between items-center">
                        <div className="font-medium">{variant.name}</div>
                        <Badge variant="outline">${variant.price.toFixed(2)}</Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="p-4 pt-2">
                      <div className="flex justify-between text-sm text-muted-foreground">
                        <span>Pedidos:</span>
                        <span className="font-medium">{variant.order_count || 0}</span>
                      </div>
                      {product.total_orders > 0 && (
                        <div className="mt-2">
                          <div className="text-xs text-muted-foreground mb-1">
                            Porcentaje del total de pedidos
                          </div>
                          <div className="flex items-center gap-2">
                            <Progress 
                              value={(variant.order_count || 0) / product.total_orders * 100} 
                              className="h-2" 
                            />
                            <span className="text-xs min-w-[2.5rem] text-right">
                              {((variant.order_count || 0) / product.total_orders * 100).toFixed(1)}%
                            </span>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </AppLayout>
  );
};

export default ProductDetail;
