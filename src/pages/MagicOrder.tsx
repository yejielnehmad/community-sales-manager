import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useForm } from "react-hook-form";
import { useState, useEffect } from "react";
import { MessageAnalysis, Client, Product, ProductVariant, OrderItem } from "@/types";
import { supabase } from "@/integrations/supabase/client";
import { GOOGLE_API_KEY } from "@/lib/api-config";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { 
  Sparkles, 
  ArrowRight, 
  Loader2, 
  ShoppingCart, 
  User, 
  Plus, 
  Minus, 
  CheckCircle,
  Trash
} from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface OrderForm {
  message: string;
  clientId: string;
  items: OrderItem[];
  amountPaid: number;
}

const MagicOrder = () => {
  const [analyzing, setAnalyzing] = useState(false);
  const [messageAnalysis, setMessageAnalysis] = useState<MessageAnalysis | null>(null);
  const [clients, setClients] = useState<Client[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingOrder, setSavingOrder] = useState(false);
  const navigate = useNavigate();
  
  const form = useForm<OrderForm>({
    defaultValues: {
      message: "",
      clientId: "",
      items: [],
      amountPaid: 0,
    }
  });
  
  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: clientsData, error: clientsError } = await supabase
        .from('clients')
        .select('*')
        .order('name');
      
      if (clientsError) throw clientsError;
      
      const { data: productsData, error: productsError } = await supabase
        .from('products')
        .select('*')
        .order('name');
      
      if (productsError) throw productsError;
      
      const productsWithVariants = await Promise.all(
        (productsData || []).map(async (product) => {
          const { data: variantsData, error: variantsError } = await supabase
            .from('product_variants')
            .select('*')
            .eq('product_id', product.id);
          
          if (variantsError) throw variantsError;
          
          return {
            id: product.id,
            name: product.name,
            description: product.description || '',
            price: parseFloat(product.price),
            variants: variantsData?.map(v => ({
              id: v.id,
              name: v.name,
              price: parseFloat(v.price)
            })) || []
          } as Product;
        })
      );
      
      setClients(clientsData?.map(c => ({
        id: c.id,
        name: c.name,
        phone: c.phone || '',
        createdAt: c.created_at,
        totalOrders: 0,
        balance: 0
      })) || []);
      
      setProducts(productsWithVariants);
    } catch (error) {
      console.error('Error al cargar datos:', error);
      toast.error('Error al cargar los datos necesarios');
    } finally {
      setLoading(false);
    }
  };
  
  useEffect(() => {
    fetchData();
  }, []);
  
  const analyzeMessage = async (message: string) => {
    if (!message.trim()) {
      toast.error('Por favor, ingresa un mensaje para analizar');
      return;
    }
    
    setAnalyzing(true);
    setMessageAnalysis(null);
    
    try {
      const response = await fetch("https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=" + GOOGLE_API_KEY, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: `Analiza este mensaje y extrae la siguiente información:
1. Nombre del cliente
2. Lista de productos con cantidad

El mensaje es: "${message}"

Devuelve SOLO un objeto JSON con esta estructura exacta (sin explicaciones adicionales):
{
  "client": {
    "name": "Nombre del cliente"
  },
  "items": [
    {
      "product": "nombre del producto exacto",
      "quantity": número,
      "variant": "nombre de la variante (opcional)" 
    }
  ]
}

Solo devuelve un objeto JSON válido, nada más. Si no puedes identificar algún campo, déjalo vacío o con valor 0 según corresponda.`
            }]
          }],
          generationConfig: {
            temperature: 0.2,
            topK: 40,
            topP: 0.95,
          }
        }),
      });
      
      const data = await response.json();
      
      if (data.error) {
        throw new Error(data.error.message || 'Error al analizar el mensaje');
      }
      
      const generatedText = data.candidates[0].content.parts[0].text;
      
      const jsonMatch = generatedText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No se pudo extraer la información del mensaje');
      }
      
      const parsedResult = JSON.parse(jsonMatch[0]) as MessageAnalysis;
      setMessageAnalysis(parsedResult);
      
      if (parsedResult.client?.name) {
        const matchingClient = clients.find(c => 
          c.name.toLowerCase().includes(parsedResult.client!.name.toLowerCase())
        );
        
        if (matchingClient) {
          form.setValue('clientId', matchingClient.id);
        }
      }
      
      const orderItems: OrderItem[] = [];
      
      for (const item of parsedResult.items) {
        const matchingProduct = products.find(p => 
          p.name.toLowerCase().includes(item.product.toLowerCase())
        );
        
        if (matchingProduct) {
          let variantId: string | undefined;
          let variantName: string | undefined;
          let price = matchingProduct.price;
          
          if (item.variant) {
            const matchingVariant = matchingProduct.variants?.find(v => 
              v.name.toLowerCase().includes(item.variant!.toLowerCase())
            );
            
            if (matchingVariant) {
              variantId = matchingVariant.id;
              variantName = matchingVariant.name;
              price = matchingVariant.price;
            }
          }
          
          orderItems.push({
            id: `temp-${Date.now()}-${orderItems.length}`,
            productId: matchingProduct.id,
            productName: matchingProduct.name,
            variantId,
            variantName,
            quantity: item.quantity || 1,
            price,
            total: price * (item.quantity || 1)
          });
        }
      }
      
      form.setValue('items', orderItems);
    } catch (error) {
      console.error('Error al analizar el mensaje:', error);
      toast.error('Error al analizar el mensaje con IA');
    } finally {
      setAnalyzing(false);
    }
  };
  
  const updateItemQuantity = (index: number, newQuantity: number) => {
    if (newQuantity <= 0) return;
    
    const currentItems = form.getValues('items');
    const updatedItems = [...currentItems];
    updatedItems[index] = {
      ...updatedItems[index],
      quantity: newQuantity,
      total: updatedItems[index].price * newQuantity
    };
    
    form.setValue('items', updatedItems);
  };
  
  const removeItem = (index: number) => {
    const currentItems = form.getValues('items');
    const updatedItems = currentItems.filter((_, i) => i !== index);
    form.setValue('items', updatedItems);
  };
  
  const updateItemVariant = (index: number, variantId: string) => {
    const currentItems = form.getValues('items');
    const item = currentItems[index];
    const product = products.find(p => p.id === item.productId);
    
    if (!product) return;
    
    if (variantId === 'base') {
      const updatedItem = {
        ...item,
        variantId: undefined,
        variantName: undefined,
        price: product.price,
        total: product.price * item.quantity
      };
      
      const updatedItems = [...currentItems];
      updatedItems[index] = updatedItem;
      form.setValue('items', updatedItems);
    } else {
      const variant = product.variants?.find(v => v.id === variantId);
      
      if (variant) {
        const updatedItem = {
          ...item,
          variantId: variant.id,
          variantName: variant.name,
          price: variant.price,
          total: variant.price * item.quantity
        };
        
        const updatedItems = [...currentItems];
        updatedItems[index] = updatedItem;
        form.setValue('items', updatedItems);
      }
    }
  };
  
  const addNewProduct = (productId: string, variantId?: string) => {
    const product = products.find(p => p.id === productId);
    if (!product) return;
    
    let price = product.price;
    let variantName: string | undefined;
    
    if (variantId && variantId !== 'base') {
      const variant = product.variants?.find(v => v.id === variantId);
      if (variant) {
        price = variant.price;
        variantName = variant.name;
      }
    }
    
    const newItem: OrderItem = {
      id: `temp-${Date.now()}`,
      productId: product.id,
      productName: product.name,
      variantId: variantId !== 'base' ? variantId : undefined,
      variantName,
      quantity: 1,
      price,
      total: price
    };
    
    const currentItems = form.getValues('items');
    form.setValue('items', [...currentItems, newItem]);
  };
  
  const calculateTotal = (items: OrderItem[]): number => {
    return items.reduce((sum, item) => sum + item.total, 0);
  };
  
  const handleSubmit = async (data: OrderForm) => {
    if (!data.clientId) {
      toast.error('Por favor, selecciona un cliente');
      return;
    }
    
    if (data.items.length === 0) {
      toast.error('Por favor, agrega al menos un producto al pedido');
      return;
    }
    
    setSavingOrder(true);
    
    try {
      const total = calculateTotal(data.items);
      const amountPaid = data.amountPaid || 0;
      const balance = total - amountPaid;
      
      const { data: newOrder, error: orderError } = await supabase
        .from('orders')
        .insert([{
          client_id: data.clientId,
          date: new Date().toISOString(),
          status: 'pending',
          total,
          amount_paid: amountPaid,
          balance
        }])
        .select()
        .single();
      
      if (orderError) throw orderError;
      
      const orderItems = data.items.map(item => ({
        order_id: newOrder.id,
        product_id: item.productId,
        variant_id: item.variantId,
        quantity: item.quantity,
        price: item.price,
        total: item.total
      }));
      
      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(orderItems);
      
      if (itemsError) throw itemsError;
      
      toast.success('Pedido creado correctamente');
      navigate('/orders');
    } catch (error) {
      console.error('Error al guardar el pedido:', error);
      toast.error('Error al guardar el pedido');
    } finally {
      setSavingOrder(false);
    }
  };

  const items = form.watch('items');
  const total = calculateTotal(items);
  
  return (
    <AppLayout>
      <div className="flex flex-col gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Pedido Mágico</h1>
          <p className="text-muted-foreground">Crea un nuevo pedido a partir de un mensaje</p>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <Card>
              <CardContent className="pt-6 space-y-4">
                <div className="flex items-center gap-2 text-primary">
                  <Sparkles className="h-5 w-5" />
                  <h3 className="text-lg font-medium">Análisis de mensaje</h3>
                </div>
                
                <FormField
                  control={form.control}
                  name="message"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Mensaje del cliente</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Pega aquí el mensaje del cliente..." 
                          className="min-h-[100px]"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <div className="flex justify-end">
                  <Button
                    type="button"
                    onClick={() => analyzeMessage(form.getValues('message'))}
                    disabled={analyzing}
                  >
                    {analyzing ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Analizando...
                      </>
                    ) : (
                      <>
                        <ArrowRight className="mr-2 h-4 w-4" />
                        Analizar mensaje
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
            
            {messageAnalysis && (
              <Card>
                <CardContent className="pt-6 space-y-4">
                  <div className="flex items-center gap-2 text-primary">
                    <User className="h-5 w-5" />
                    <h3 className="text-lg font-medium">Información del cliente</h3>
                  </div>
                  
                  <FormField
                    control={form.control}
                    name="clientId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Cliente</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                          value={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecciona un cliente" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {clients.map(client => (
                              <SelectItem key={client.id} value={client.id}>
                                {client.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>
            )}
            
            {messageAnalysis && (
              <Card>
                <CardContent className="pt-6 space-y-4">
                  <div className="flex items-center gap-2 text-primary">
                    <ShoppingCart className="h-5 w-5" />
                    <h3 className="text-lg font-medium">Artículos del pedido</h3>
                  </div>
                  
                  <div className="space-y-3">
                    {items.length > 0 ? (
                      items.map((item, index) => (
                        <div key={item.id} className="border rounded-md p-3 space-y-3">
                          <div className="flex justify-between">
                            <div className="font-medium">{item.productName}</div>
                            <div className="font-medium">${item.total.toFixed(2)}</div>
                          </div>
                          
                          <div className="grid grid-cols-[1fr,auto] gap-3">
                            <div>
                              <FormLabel className="text-sm">Variante</FormLabel>
                              <Select
                                value={item.variantId || 'base'}
                                onValueChange={(value) => updateItemVariant(index, value)}
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="base">
                                    Base - ${products.find(p => p.id === item.productId)?.price.toFixed(2)}
                                  </SelectItem>
                                  {products
                                    .find(p => p.id === item.productId)
                                    ?.variants?.map(variant => (
                                    <SelectItem key={variant.id} value={variant.id}>
                                      {variant.name} - ${variant.price.toFixed(2)}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            
                            <div>
                              <FormLabel className="text-sm">Cantidad</FormLabel>
                              <div className="flex rounded-md overflow-hidden border">
                                <Button
                                  type="button"
                                  variant="ghost"
                                  className="h-10 px-2 rounded-none hover:bg-muted"
                                  onClick={() => updateItemQuantity(index, item.quantity - 1)}
                                >
                                  <Minus className="h-4 w-4" />
                                </Button>
                                <div className="flex-1 flex items-center justify-center min-w-[40px]">
                                  {item.quantity}
                                </div>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  className="h-10 px-2 rounded-none hover:bg-muted"
                                  onClick={() => updateItemQuantity(index, item.quantity + 1)}
                                >
                                  <Plus className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          </div>
                          
                          <div className="text-sm text-muted-foreground">
                            ${item.price.toFixed(2)} × {item.quantity} = ${item.total.toFixed(2)}
                          </div>
                          
                          <div className="flex justify-end">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => removeItem(index)}
                            >
                              <Trash className="h-4 w-4 mr-1" />
                              Eliminar
                            </Button>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center p-6 bg-muted/20 rounded-md">
                        <p>No hay artículos en el pedido</p>
                      </div>
                    )}
                    
                    <div className="pt-2">
                      <FormLabel className="text-sm">Agregar producto</FormLabel>
                      <div className="grid grid-cols-2 gap-2">
                        <Select onValueChange={(productId) => addNewProduct(productId)}>
                          <SelectTrigger>
                            <SelectValue placeholder="Seleccionar producto" />
                          </SelectTrigger>
                          <SelectContent>
                            {products.map(product => (
                              <SelectItem key={product.id} value={product.id}>
                                {product.name} - ${product.price.toFixed(2)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => {
                            const select = document.querySelector('select');
                            if (select && select.value) {
                              addNewProduct(select.value);
                            } else {
                              toast.error('Selecciona un producto primero');
                            }
                          }}
                        >
                          <Plus className="h-4 w-4 mr-1" />
                          Agregar
                        </Button>
                      </div>
                    </div>
                  </div>
                  
                  <div className="border-t pt-3">
                    <div className="flex justify-between text-lg font-medium">
                      <span>Total:</span>
                      <span>${total.toFixed(2)}</span>
                    </div>
                  </div>
                  
                  <FormField
                    control={form.control}
                    name="amountPaid"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Monto pagado</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            max={total}
                            placeholder="0.00"
                            {...field}
                            onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  {form.watch('amountPaid') > 0 && (
                    <div className="flex justify-between font-medium">
                      <span>Saldo restante:</span>
                      <span>${(total - (form.watch('amountPaid') || 0)).toFixed(2)}</span>
                    </div>
                  )}
                  
                  <div className="flex justify-end pt-4">
                    <Button
                      type="submit"
                      disabled={savingOrder}
                      className="w-full sm:w-auto"
                    >
                      {savingOrder ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Guardando...
                        </>
                      ) : (
                        <>
                          <CheckCircle className="mr-2 h-4 w-4" />
                          Crear pedido
                        </>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </form>
        </Form>
      </div>
    </AppLayout>
  );
};

export default MagicOrder;
