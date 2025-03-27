
import { supabase } from "@/lib/supabase";

// Función para generar ejemplos basados en la base de datos
export const generateMessageExample = async (): Promise<string> => {
  try {
    // Fetch clients from database
    const { data: clients, error: clientsError } = await supabase
      .from('clients')
      .select('*')
      .limit(20);
    
    if (clientsError) throw clientsError;
    
    // Fetch products from database
    const { data: products, error: productsError } = await supabase
      .from('products')
      .select('*')
      .limit(20);
    
    if (productsError) throw productsError;
    
    // Fetch product variants from database
    const { data: variants, error: variantsError } = await supabase
      .from('product_variants')
      .select('*')
      .limit(40);
    
    if (variantsError) throw variantsError;
    
    if (!clients || clients.length === 0 || !products || products.length === 0) {
      return "moshe 3 pañales m, 4 g y cinco latas atún , graciasss";
    }
    
    // Agrupar variantes por producto
    const variantsByProduct = variants?.reduce((acc, variant) => {
      if (!acc[variant.product_id]) {
        acc[variant.product_id] = [];
      }
      acc[variant.product_id].push(variant);
      return acc;
    }, {} as Record<string, any[]>) || {};
    
    // Crear un mensaje de ejemplo con clientes y productos reales
    const selectedClients = [];
    const clientCount = Math.min(Math.floor(Math.random() * 3) + 3, clients.length); // 3-5 clientes aleatorios
    
    // Seleccionar clientes aleatorios sin repetición
    const shuffledClients = [...clients].sort(() => 0.5 - Math.random());
    const clientsToUse = shuffledClients.slice(0, clientCount);
    
    let message = '';
    
    // Para cada cliente, generar un pedido con 1-5 productos aleatorios
    clientsToUse.forEach((client, clientIndex) => {
      // Usar solo el primer nombre o nickname del cliente, en minúsculas
      const clientName = client.name.split(' ')[0].toLowerCase();
      
      if (clientIndex > 0) {
        // Separadores entre clientes
        message += Math.random() > 0.3 ? ' - ' : ' ';
      }
      
      message += clientName;
      
      // Determinar cuántos productos incluir para este cliente (1-5)
      const productCount = Math.floor(Math.random() * 5) + 1;
      
      // Seleccionar productos aleatorios para este cliente
      const shuffledProducts = [...products].sort(() => 0.5 - Math.random());
      const productsToUse = shuffledProducts.slice(0, productCount);
      
      productsToUse.forEach((product, productIndex) => {
        // Cantidad aleatoria (1-6)
        const quantity = Math.floor(Math.random() * 6) + 1;
        
        // A veces usar texto para cantidades
        let quantityText = quantity.toString();
        if (Math.random() > 0.7) {
          const textNumbers = ['un', 'dos', 'tres', 'cuatro', 'cinco', 'seis'];
          quantityText = textNumbers[quantity - 1];
        }
        
        // Separador antes del producto
        if (productIndex === 0) {
          message += ' ';
        } else {
          const separators = [', ', ' y ', ' '];
          message += separators[Math.floor(Math.random() * separators.length)];
        }
        
        // Agregar cantidad
        message += quantityText + ' ';
        
        // Estilo del mensaje: 
        // 1. Solo producto sin variante
        // 2. Producto y variante juntos 
        // 3. Solo la variante directamente
        const messageStyle = Math.floor(Math.random() * 3);
        
        // Obtener variantes disponibles para este producto
        const productVariants = variantsByProduct[product.id] || [];
        
        if (messageStyle === 0 || productVariants.length === 0) {
          // Caso 1: Solo producto
          message += product.name.toLowerCase();
        } else if (messageStyle === 1 && productVariants.length > 0) {
          // Caso 2: Producto con variante
          const variant = productVariants[Math.floor(Math.random() * productVariants.length)];
          message += product.name.toLowerCase() + ' ' + variant.name.toLowerCase();
        } else if (messageStyle === 2 && productVariants.length > 0) {
          // Caso 3: Solo la variante directamente (asumiendo que es claro qué producto es)
          const variant = productVariants[Math.floor(Math.random() * productVariants.length)];
          message += variant.name.toLowerCase();
        }
      });
      
      // A veces agregar "gracias" al final del pedido de un cliente
      if (Math.random() > 0.7) {
        message += Math.random() > 0.5 ? ' gracias' : ' graciasss';
      }
    });
    
    return message;
  } catch (error) {
    console.error("Error al generar ejemplo:", error);
    return "moshe 3 pañales m, 4 g y cinco latas atún , graciasss";
  }
};

// Función para generar múltiples mensajes de ejemplo
export const generateMultipleExamples = async (): Promise<string> => {
  try {
    const message = await generateMessageExample();
    return message;
  } catch (error) {
    console.error("Error al generar múltiples ejemplos:", error);
    return "moshe 3 pañales m, 4 g y cinco latas atún , graciasss";
  }
};
