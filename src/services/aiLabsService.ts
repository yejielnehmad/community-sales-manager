
import { supabase } from "@/lib/supabase";

// Función para generar ejemplos basados en la base de datos
export const generateMessageExample = async (): Promise<string> => {
  try {
    // Fetch clients from database
    const { data: clients, error: clientsError } = await supabase
      .from('clients')
      .select('*')
      .limit(5);
    
    if (clientsError) throw clientsError;
    
    // Fetch products from database
    const { data: products, error: productsError } = await supabase
      .from('products')
      .select('*')
      .limit(10);
    
    if (productsError) throw productsError;
    
    if (!clients || clients.length === 0 || !products || products.length === 0) {
      return "Hola, soy María López y quiero 2 paquetes de pañales talla 1 y 1.5 kg de queso fresco. También necesito 3 botellas de leche y una crema para bebé. Gracias!";
    }
    
    // Generate random example based on real data
    const client = clients[Math.floor(Math.random() * clients.length)];
    
    let message = `Hola, soy ${client.name} y quiero `;
    
    // Add 3-5 random products with quantities
    const numProducts = Math.floor(Math.random() * 3) + 3;
    const selectedProducts = [];
    
    for (let i = 0; i < numProducts; i++) {
      if (products.length === 0) break;
      
      const randomIndex = Math.floor(Math.random() * products.length);
      const product = products[randomIndex];
      products.splice(randomIndex, 1); // Remove to avoid duplicates
      
      const quantity = Math.floor(Math.random() * 5) + 1;
      
      if (i > 0) {
        if (i === numProducts - 1) {
          message += " y ";
        } else {
          message += ", ";
        }
      }
      
      message += `${quantity} ${product.name}`;
      selectedProducts.push(product);
    }
    
    // Add some variations and typos to make it more realistic
    const variations = [
      " por favor.",
      ". Necesito que me lo envíen hoy.",
      ". ¿Cuánto sería en total?",
      ". Gracias!",
      ". Lo necesito para mañana, me urge."
    ];
    
    message += variations[Math.floor(Math.random() * variations.length)];
    
    return message;
  } catch (error) {
    console.error("Error al generar ejemplo:", error);
    return "Hola, soy Juan Pérez y necesito 2 kg de queso fresco, 3 paquetes de tortillas y 1 botella de leche. Gracias!";
  }
};

// Función para generar 5 mensajes de ejemplo con diferentes clientes y productos
export const generateMultipleExamples = async (count = 5): Promise<string> => {
  try {
    const messages = [];
    
    for (let i = 0; i < count; i++) {
      const message = await generateMessageExample();
      messages.push(message);
    }
    
    return messages.join("\n\n---\n\n");
  } catch (error) {
    console.error("Error al generar múltiples ejemplos:", error);
    return "No se pudieron generar ejemplos en este momento.";
  }
};
