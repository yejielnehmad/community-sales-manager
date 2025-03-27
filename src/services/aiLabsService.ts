
import { supabase } from "@/lib/supabase";

// Función para generar ejemplos basados en la base de datos
export const generateMessageExample = async (): Promise<string> => {
  try {
    // Fetch clients from database
    const { data: clients, error: clientsError } = await supabase
      .from('clients')
      .select('*');
    
    if (clientsError) throw clientsError;
    
    // Fetch products from database
    const { data: products, error: productsError } = await supabase
      .from('products')
      .select('*');
    
    if (productsError) throw productsError;
    
    // Fetch product variants from database
    const { data: variants, error: variantsError } = await supabase
      .from('product_variants')
      .select('*');
    
    if (variantsError) throw variantsError;
    
    if (!clients || clients.length === 0 || !products || products.length === 0) {
      return "moshe 3 pañales m, 4 g y cinco latas atún, graciasss";
    }
    
    // Elegir un cliente aleatorio para el mensaje
    const randomClient = clients[Math.floor(Math.random() * clients.length)];
    const clientName = randomClient.name.split(' ')[0].toLowerCase(); // Usar solo el primer nombre en minúsculas
    
    // Construir mensaje con formato informal
    let message = clientName;
    
    // Añadir entre 1 y 6 productos al pedido
    const numProducts = Math.floor(Math.random() * 6) + 1;
    const productsArray = [...products];
    const selectedProducts = [];
    
    for (let i = 0; i < numProducts && productsArray.length > 0; i++) {
      const randomProductIndex = Math.floor(Math.random() * productsArray.length);
      const product = productsArray[randomProductIndex];
      productsArray.splice(randomProductIndex, 1); // Eliminar para evitar duplicados
      
      // Cantidad como número o texto aleatorio
      const quantity = Math.floor(Math.random() * 5) + 1;
      let quantityText = quantity.toString();
      
      // A veces usar texto para las cantidades
      if (Math.random() > 0.7) {
        const textNumbers = ['uno', 'dos', 'tres', 'cuatro', 'cinco'];
        if (quantity <= textNumbers.length) {
          quantityText = textNumbers[quantity - 1];
        }
      }

      // Buscar variantes para este producto
      const productVariants = variants.filter(v => v.product_id === product.id);
      const hasVariant = productVariants.length > 0 && Math.random() > 0.3;
      
      let variant = null;
      if (hasVariant) {
        variant = productVariants[Math.floor(Math.random() * productVariants.length)];
      }
      
      // Determinar tipo de pedido (solo producto, solo variante, o ambos)
      const pedidoType = Math.floor(Math.random() * 3);
      
      let pedidoText = '';
      switch (pedidoType) {
        case 0: // Solo producto
          if (Math.random() > 0.5) {
            pedidoText = `${quantityText} ${product.name.toLowerCase()}`;
          } else {
            pedidoText = `${product.name.toLowerCase()} ${quantityText}`;
          }
          break;
        case 1: // Solo variante (si tiene variante, sino producto)
          if (hasVariant) {
            if (Math.random() > 0.5) {
              pedidoText = `${quantityText} ${variant.name.toLowerCase()}`;
            } else {
              pedidoText = `${variant.name.toLowerCase()} ${quantityText}`;
            }
          } else {
            pedidoText = `${quantityText} ${product.name.toLowerCase()}`;
          }
          break;
        case 2: // Producto y variante
          if (hasVariant) {
            if (Math.random() > 0.5) {
              pedidoText = `${quantityText} ${product.name.toLowerCase()} ${variant.name.toLowerCase()}`;
            } else {
              pedidoText = `${quantityText} ${variant.name.toLowerCase()} de ${product.name.toLowerCase()}`;
            }
            // A veces invertir el orden
            if (Math.random() > 0.7) {
              const parts = pedidoText.split(' ');
              const reordered = [parts[0], ...parts.slice(2), parts[1]].join(' ');
              pedidoText = reordered;
            }
          } else {
            pedidoText = `${quantityText} ${product.name.toLowerCase()}`;
          }
          break;
      }
      
      selectedProducts.push(pedidoText);
    }
    
    // Unir productos con separadores aleatorios
    for (let i = 0; i < selectedProducts.length; i++) {
      if (i > 0) {
        const separators = [', ', ' y ', ' también ', ' + ', ' '];
        message += separators[Math.floor(Math.random() * separators.length)];
      } else {
        message += ' ';
      }
      message += selectedProducts[i];
    }
    
    // A veces añadir "gracias" al final
    if (Math.random() > 0.7) {
      const gracias = [' gracias', ' graciasss', ' xfa', ' por favor', ''];
      message += gracias[Math.floor(Math.random() * gracias.length)];
    }
    
    return message;
  } catch (error) {
    console.error("Error al generar ejemplo:", error);
    return "moshe 3 pañales m, 4 g y cinco latas atún, graciasss";
  }
};

// Función para generar múltiples mensajes de ejemplo con diferentes clientes y productos
export const generateMultipleExamples = async (): Promise<string> => {
  try {
    // Fetch todos los clientes de la base de datos
    const { data: clients, error: clientsError } = await supabase
      .from('clients')
      .select('*');
    
    if (clientsError) throw clientsError;
    
    if (!clients || clients.length === 0) {
      return "moshe 3 pañales m, 4 g y cinco latas atún, graciasss";
    }
    
    // Elegir 7-8 clientes al azar para el mensaje (o menos si no hay suficientes)
    const numClients = Math.min(clients.length, Math.floor(Math.random() * 2) + 7); // Entre 7 y 8 clientes
    
    // Barajar el array de clientes
    const shuffledClients = [...clients].sort(() => Math.random() - 0.5);
    const selectedClients = shuffledClients.slice(0, numClients);
    
    // Generar un mensaje por cada cliente seleccionado
    const clientMessages = await Promise.all(
      selectedClients.map(async (client) => {
        // Crear un mensaje personalizado para este cliente
        const { data: products, error: productsError } = await supabase
          .from('products')
          .select('*');
        
        if (productsError) throw productsError;
        
        // Fetch product variants from database
        const { data: variants, error: variantsError } = await supabase
          .from('product_variants')
          .select('*');
        
        if (variantsError) throw variantsError;
        
        if (!products || products.length === 0) {
          return `${client.name.split(' ')[0].toLowerCase()} 3 pañales m`;
        }
        
        // Construir mensaje con formato informal
        let message = client.name.split(' ')[0].toLowerCase();
        
        // Añadir entre 1 y 6 productos al pedido
        const numProducts = Math.floor(Math.random() * 6) + 1;
        const productsArray = [...products];
        const selectedProducts = [];
        
        for (let i = 0; i < numProducts && productsArray.length > 0; i++) {
          const randomProductIndex = Math.floor(Math.random() * productsArray.length);
          const product = productsArray[randomProductIndex];
          productsArray.splice(randomProductIndex, 1); // Eliminar para evitar duplicados
          
          // Cantidad como número o texto aleatorio
          const quantity = Math.floor(Math.random() * 5) + 1;
          let quantityText = quantity.toString();
          
          // A veces usar texto para las cantidades
          if (Math.random() > 0.7) {
            const textNumbers = ['uno', 'dos', 'tres', 'cuatro', 'cinco'];
            if (quantity <= textNumbers.length) {
              quantityText = textNumbers[quantity - 1];
            }
          }

          // Buscar variantes para este producto
          const productVariants = variants.filter(v => v.product_id === product.id);
          const hasVariant = productVariants.length > 0 && Math.random() > 0.3;
          
          let variant = null;
          if (hasVariant) {
            variant = productVariants[Math.floor(Math.random() * productVariants.length)];
          }
          
          // Determinar tipo de pedido (solo producto, solo variante, o ambos)
          const pedidoType = Math.floor(Math.random() * 3);
          
          let pedidoText = '';
          switch (pedidoType) {
            case 0: // Solo producto
              if (Math.random() > 0.5) {
                pedidoText = `${quantityText} ${product.name.toLowerCase()}`;
              } else {
                pedidoText = `${product.name.toLowerCase()} ${quantityText}`;
              }
              break;
            case 1: // Solo variante (si tiene variante, sino producto)
              if (hasVariant) {
                if (Math.random() > 0.5) {
                  pedidoText = `${quantityText} ${variant.name.toLowerCase()}`;
                } else {
                  pedidoText = `${variant.name.toLowerCase()} ${quantityText}`;
                }
              } else {
                pedidoText = `${quantityText} ${product.name.toLowerCase()}`;
              }
              break;
            case 2: // Producto y variante
              if (hasVariant) {
                if (Math.random() > 0.5) {
                  pedidoText = `${quantityText} ${product.name.toLowerCase()} ${variant.name.toLowerCase()}`;
                } else {
                  pedidoText = `${quantityText} ${variant.name.toLowerCase()} de ${product.name.toLowerCase()}`;
                }
                // A veces invertir el orden
                if (Math.random() > 0.7) {
                  const parts = pedidoText.split(' ');
                  const reordered = [parts[0], ...parts.slice(2), parts[1]].join(' ');
                  pedidoText = reordered;
                }
              } else {
                pedidoText = `${quantityText} ${product.name.toLowerCase()}`;
              }
              break;
          }
          
          selectedProducts.push(pedidoText);
        }
        
        // Unir productos con separadores aleatorios
        for (let i = 0; i < selectedProducts.length; i++) {
          if (i > 0) {
            const separators = [', ', ' y ', ' también ', ' + ', ' '];
            message += separators[Math.floor(Math.random() * separators.length)];
          } else {
            message += ' ';
          }
          message += selectedProducts[i];
        }
        
        // A veces añadir "gracias" al final
        if (Math.random() > 0.7) {
          const gracias = [' gracias', ' graciasss', ' xfa', ' por favor', ''];
          message += gracias[Math.floor(Math.random() * gracias.length)];
        }
        
        return message;
      })
    );
    
    // Unir todos los mensajes con saltos de línea
    return clientMessages.join('\n');
  } catch (error) {
    console.error("Error al generar múltiples ejemplos:", error);
    return "moshe 3 pañales m, 4 g y cinco latas atún, graciasss";
  }
};
