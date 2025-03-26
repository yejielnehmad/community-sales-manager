
import { supabase } from "@/lib/supabase";

// Función para generar ejemplos basados en la base de datos
export const generateMessageExample = async (): Promise<string> => {
  try {
    // Fetch clients from database
    const { data: clients, error: clientsError } = await supabase
      .from('clients')
      .select('*')
      .limit(15);
    
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
      .limit(30);
    
    if (variantsError) throw variantsError;
    
    if (!clients || clients.length === 0 || !products || products.length === 0) {
      return "moshe 3 pañales m, 4 g y cinco latas atún , graciasss marcos 5 g 5m 3 pastron netu 5 pañales g dos fiambre un rollo gracias";
    }
    
    // Seleccionar 4-5 clientes aleatoriamente para el mensaje
    const selectedClients = [];
    const clientsCount = Math.min(Math.floor(Math.random() * 2) + 4, clients.length); // 4-5 clientes
    
    for (let i = 0; i < clientsCount; i++) {
      if (clients.length === 0) break;
      const randomIndex = Math.floor(Math.random() * clients.length);
      selectedClients.push(clients[randomIndex].name.split(' ')[0].toLowerCase()); // Usar solo el primer nombre en minúsculas
      clients.splice(randomIndex, 1); // Eliminar para evitar duplicados
    }
    
    // Construir mensaje con formato informal con múltiples clientes
    let message = '';
    
    for (let i = 0; i < selectedClients.length; i++) {
      const clientName = selectedClients[i];
      
      if (i > 0) {
        message += ' ';
        // Añadir una separación más clara entre clientes
        if (Math.random() > 0.5) {
          message += Math.random() > 0.5 ? '/ ' : '- ';
        }
      }
      
      message += clientName;
      
      // Añadir 2-4 productos por cliente
      const numProducts = Math.floor(Math.random() * 3) + 2;
      const productsArray = [...products];
      
      for (let j = 0; j < numProducts && productsArray.length > 0; j++) {
        const randomProductIndex = Math.floor(Math.random() * productsArray.length);
        const product = productsArray[randomProductIndex];
        productsArray.splice(randomProductIndex, 1); // Eliminar para evitar duplicados
        
        // Cantidad como número o texto aleatorio
        const quantity = Math.floor(Math.random() * 5) + 1;
        let quantityText = quantity.toString();
        
        // A veces usar texto para las cantidades
        if (Math.random() > 0.7) {
          const textNumbers = ['uno', 'dos', 'tres', 'cuatro', 'cinco'];
          quantityText = textNumbers[quantity - 1];
        }
        
        message += ' ' + quantityText + ' ';
        
        // Abreviar o simplificar nombres de productos
        let productName = product.name.toLowerCase();
        if (productName.length > 8 && Math.random() > 0.5) {
          productName = productName.split(' ')[0]; // Usar solo la primera palabra
        }
        
        message += productName;
        
        // Añadir variantes como letras simples (m, g, etc)
        if (Math.random() > 0.5 && variants && variants.length > 0) {
          // Buscar variantes para este producto
          const productVariants = variants.filter(v => v.product_id === product.id);
          
          if (productVariants.length > 0) {
            const randomVariant = productVariants[Math.floor(Math.random() * productVariants.length)];
            message += ' ' + randomVariant.name.toLowerCase().charAt(0);
          } else {
            const variantLetters = ['m', 'g', 'p', 'c', 'x'];
            message += ' ' + variantLetters[Math.floor(Math.random() * variantLetters.length)];
          }
        }
        
        // Separadores entre productos
        if (j < numProducts - 1) {
          const separators = [',', ' y ', ' '];
          message += separators[Math.floor(Math.random() * separators.length)];
        }
      }
      
      // A veces añadir "gracias" al final
      if (Math.random() > 0.7) {
        message += Math.random() > 0.5 ? ' gracias' : ' graciasss';
      }
    }
    
    // Asegurar que el mensaje tenga elementos típicos del formato solicitado
    if (!message.includes('g') && !message.includes('m')) {
      message += ' 3 pañales g 2m';
    }
    
    return message;
  } catch (error) {
    console.error("Error al generar ejemplo:", error);
    return "moshe 3 pañales m, 4 g y cinco latas atún , graciasss marcos 5 g 5m 3 pastron netu 5 pañales g dos fiambre un rollo gracias";
  }
};

// Función para generar múltiples mensajes de ejemplo con diferentes clientes y productos
export const generateMultipleExamples = async (count = 5): Promise<string> => {
  try {
    // Solo generamos un único ejemplo como solicitado
    const message = await generateMessageExample();
    return message;
  } catch (error) {
    console.error("Error al generar múltiples ejemplos:", error);
    return "moshe 3 pañales m, 4 g y cinco latas atún , graciasss";
  }
};
