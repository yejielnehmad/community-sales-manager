
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
      return "Hola, soy María López y quiero 2 paquetes de pañales talla 1 y 1.5 kg de queso fresco. También necesito 3 botellas de leche y una crema para bebé. Gracias!";
    }
    
    // Generate random example based on real data
    const client = clients[Math.floor(Math.random() * clients.length)];
    
    let message = `Hola${Math.random() > 0.5 ? ' buenas' : ''}${Math.random() > 0.7 ? ' tardes' : (Math.random() > 0.5 ? ' días' : ' noches')}, soy ${client.name}${Math.random() > 0.5 ? ' del ' + Math.floor(Math.random() * 5) + (Math.random() > 0.5 ? 'A' : 'B') : ''}. ${Math.random() > 0.5 ? 'Te escribo para ' : ''}${Math.random() > 0.7 ? 'hacer un pedido' : (Math.random() > 0.5 ? 'pedir' : 'necesito')}`;
    
    // Intro variations
    const introVariations = [
      ': ',
      '. Quiero pedir: ',
      '. Necesitaría ',
      '. Te hago el pedido mensual: ',
      '. Para mañana necesitaría ',
      '. Quería saber si podés apartarme: '
    ];
    
    message += introVariations[Math.floor(Math.random() * introVariations.length)];
    
    // Add 3-5 random products with quantities
    const numProducts = Math.floor(Math.random() * 3) + 3;
    const selectedProducts = [];
    const productVariants = new Map();
    
    // Group variants by product
    if (variants && variants.length) {
      variants.forEach(variant => {
        if (!productVariants.has(variant.product_id)) {
          productVariants.set(variant.product_id, []);
        }
        productVariants.get(variant.product_id).push(variant);
      });
    }
    
    // Available quantity expressions
    const quantityExpressions = [
      (q: number) => `${q}`,
      (q: number) => `${q} unidades de`,
      (q: number) => `${q} paquetes de`,
      (q: number) => `${q} kg de`,
      (q: number) => q === 1 ? `un` : `${q}`,
      (q: number) => q === 1 ? `una` : `${q}`,
      (q: number) => `${q * 100} gramos de`,
      (q: number) => `${q} litros de`,
      (q: number) => `${q / 2} kg de`
    ];
    
    const productsArray = [...products];
    
    for (let i = 0; i < numProducts; i++) {
      if (productsArray.length === 0) break;
      
      const randomIndex = Math.floor(Math.random() * productsArray.length);
      const product = productsArray[randomIndex];
      productsArray.splice(randomIndex, 1); // Remove to avoid duplicates
      
      const quantity = Math.floor(Math.random() * 5) + 1;
      const quantityExpression = quantityExpressions[Math.floor(Math.random() * quantityExpressions.length)];
      
      // Add connector
      if (i > 0) {
        if (i === numProducts - 1) {
          message += Math.random() > 0.5 ? " y " : " y también ";
        } else {
          message += Math.random() > 0.7 ? ", " : (Math.random() > 0.5 ? ". También " : ", ");
        }
      }
      
      // Add product with quantity
      message += `${quantityExpression(quantity)} ${product.name}`;
      
      // Randomly add variant if available
      const variants = productVariants.get(product.id);
      if (variants && variants.length > 0 && Math.random() > 0.5) {
        const randomVariant = variants[Math.floor(Math.random() * variants.length)];
        message += ` ${Math.random() > 0.5 ? 'de ' : ''}${randomVariant.name}`;
      }
      
      // Randomly add detail
      if (Math.random() > 0.7) {
        const details = [
          "los grandes",
          "sabor tradicional",
          "tamaño familiar",
          "de primera calidad",
          "marca importada",
          "de los que compramos siempre",
          "de marca económica",
          "los que vienen en envase de plástico",
          "los de oferta"
        ];
        message += ` (${details[Math.floor(Math.random() * details.length)]})`;
      }
      
      selectedProducts.push(product);
    }
    
    // Add some variations and typos to make it more realistic
    const variations = [
      ". Por favor.",
      ". Necesito que me lo envíen hoy.",
      "? ¿Cuánto sería en total?",
      ". Gracias!",
      ". Lo necesito para mañana, me urge.",
      ". Avísame si tienes todo disponible.",
      ". Si no tienes alguno, podés reemplazarlo por otro similar.",
      ". Después paso a buscar el pedido a eso de las 5, te sirve?",
      ". Un abrazo",
      ". ¡Gracias por tu atención!"
    ];
    
    message += variations[Math.floor(Math.random() * variations.length)];
    
    // Add typos occasionally
    if (Math.random() > 0.8) {
      message = message.replace(/e/g, (match) => Math.random() > 0.9 ? 'é' : match);
      message = message.replace(/a/g, (match) => Math.random() > 0.9 ? 'á' : match);
    }
    
    return message;
  } catch (error) {
    console.error("Error al generar ejemplo:", error);
    return "Hola, soy Juan Pérez y necesito 2 kg de queso fresco, 3 paquetes de tortillas y 1 botella de leche. Gracias!";
  }
};

// Función para generar múltiples mensajes de ejemplo con diferentes clientes y productos
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
