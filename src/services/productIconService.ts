
import { Beef, Baby, Milk, Package, Apple, Coffee, ShoppingBag, Egg, Sandwich, Pizza, Fish, Banana, Beer, Cake, Cookie, Wine, Carrot, Utensils, ShoppingCart } from "lucide-react";

type IconKey = 
  | "default" 
  | "carne" 
  | "bebé" 
  | "leche" 
  | "paquete" 
  | "manzana" 
  | "café"
  | "bolsa" 
  | "huevo" 
  | "sándwich" 
  | "pizza" 
  | "pescado" 
  | "banana" 
  | "cerveza" 
  | "pastel" 
  | "galleta"
  | "vino" 
  | "zanahoria" 
  | "comida";

// Mapeo de iconos por categoría
const iconMap = {
  default: ShoppingCart,
  carne: Beef,
  bebé: Baby,
  leche: Milk,
  paquete: Package,
  manzana: Apple,
  café: Coffee,
  bolsa: ShoppingBag,
  huevo: Egg,
  sándwich: Sandwich,
  pizza: Pizza,
  pescado: Fish,
  banana: Banana,
  cerveza: Beer,
  pastel: Cake,
  galleta: Cookie,
  vino: Wine,
  zanahoria: Carrot,
  comida: Utensils,
};

// Palabras clave asociadas a cada categoría de icono
const keywordMap: Record<IconKey, string[]> = {
  default: [],
  carne: ["carne", "res", "pollo", "cerdo", "filete", "milanesa", "hamburguesa", "lomo", "vacío", "chorizo", "salchicha"],
  bebé: ["bebé", "pañal", "toallita", "mamadera", "chupete", "talco", "infantil", "fórmula"],
  leche: ["leche", "yogur", "yogurt", "queso", "lácteo", "crema", "manteca", "mantequilla"],
  paquete: ["paquete", "caja", "envase", "kit", "conjunto", "set"],
  manzana: ["manzana", "fruta", "pera", "durazno", "frutal", "ciruela", "damasco", "frutilla"],
  café: ["café", "té", "infusión", "mate", "yerba"],
  bolsa: ["bolsa", "bolsón", "pack"],
  huevo: ["huevo", "docena", "maple"],
  sándwich: ["sándwich", "sandwich", "pan", "panificado", "tostada", "medialunas"],
  pizza: ["pizza", "prepizza", "masa", "empanada", "tarta"],
  pescado: ["pescado", "atún", "sardina", "marisco", "camarón", "calamar"],
  banana: ["banana", "plátano", "kiwi", "naranja", "mandarina", "tropical"],
  cerveza: ["cerveza", "birra", "alcohol", "bebida", "gaseosa", "refresco", "soda", "agua"],
  pastel: ["pastel", "torta", "postre", "dulce"],
  galleta: ["galleta", "galletita", "bizcocho", "bizcochuelo", "cookie"],
  vino: ["vino", "champagne", "espumante", "licor", "aperitivo", "fernet"],
  zanahoria: ["zanahoria", "verdura", "vegetal", "lechuga", "tomate", "papa", "cebolla", "hortalizas"],
  comida: ["comida", "alimento", "cereal", "arroz", "fideo", "pasta", "salsa", "condimento", "aderezo"],
};

export const getProductIcon = (productName: string) => {
  const lowerName = productName.toLowerCase();
  
  // Buscar coincidencias en las palabras clave
  for (const [category, keywords] of Object.entries(keywordMap)) {
    for (const keyword of keywords) {
      if (lowerName.includes(keyword)) {
        return iconMap[category as IconKey];
      }
    }
  }
  
  // Si no hay coincidencia, devolver el icono por defecto
  return iconMap.default;
};
