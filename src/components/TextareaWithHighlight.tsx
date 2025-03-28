
import { useState, useEffect, useMemo } from 'react';
import { Textarea, TextareaProps } from '@/components/ui/textarea';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface HighlightedWord {
  word: string;
  type: 'unknown-client' | 'unknown-product';
}

interface TextareaWithHighlightProps extends Omit<TextareaProps, 'ref'> {
  clients: any[];
  products: any[];
  clearable?: boolean;
  onClear?: () => void;
  highlightUnknownWords?: boolean; // Nuevo prop para controlar si se resaltan palabras en tiempo real
}

export const TextareaWithHighlight = ({
  value,
  onChange,
  clients,
  products,
  clearable = false,
  onClear,
  className,
  highlightUnknownWords = false, // Por defecto, no resaltar en tiempo real
  ...props
}: TextareaWithHighlightProps) => {
  const [unknownWords, setUnknownWords] = useState<HighlightedWord[]>([]);
  const stringValue = value as string || '';
  
  const clientNames = useMemo(() => {
    return clients.map(client => client.name.toLowerCase().split(' ')[0]);
  }, [clients]);
  
  const productNames = useMemo(() => {
    const names = products.map(product => product.name.toLowerCase());
    // Agregar variantes
    products.forEach(product => {
      if (product.variants) {
        product.variants.forEach((variant: any) => {
          names.push(variant.name.toLowerCase());
        });
      }
    });
    return names;
  }, [products]);
  
  useEffect(() => {
    // Solo ejecutar la detección de palabras desconocidas si highlightUnknownWords es true
    if (!highlightUnknownWords || !stringValue || !clients.length || !products.length) {
      setUnknownWords([]);
      return;
    }
    
    // Ignorar palabras comunes y números
    const stopWords = new Set([
      'y', 'el', 'la', 'los', 'las', 'un', 'una', 'unos', 'unas', 'de', 'del', 'a', 'al', 
      'en', 'para', 'por', 'con', 'tambien', 'también', 'más', 'mas', 'menos', 'gracias',
      'kg', 'kilo', 'kilos', 'g', 'gramo', 'gramos', 'litro', 'litros', 'l', 'ml',
      'por', 'favor', 'xfa', 'porfa', 'quiero', 'necesito', 'me', 'te', 'se', 'mi',
      'me', 'manda', 'mandame', 'enviame', 'uno', 'dos', 'tres', 'cuatro', 'cinco',
      'seis', 'siete', 'ocho', 'nueve', 'diez', 'docena', 'media', 'medio'
    ]);
    
    // Dividir el texto en palabras, ignorando signos de puntuación y números
    const words = stringValue
      .toLowerCase()
      .replace(/[.,\/#!$%\^&\*;:{}=\_`~()]/g, '')
      .split(/\s+/)
      .filter(word => 
        !stopWords.has(word) && 
        !/^\d+$/.test(word) &&
        word.length > 2
      );
    
    const unknownWordsFound: HighlightedWord[] = [];
    
    // Procesar solo las primeras palabras (posibles nombres de clientes)
    const firstWords = words.slice(0, 3);
    const otherWords = words.slice(3);
    
    // Comprobar nombres de clientes
    firstWords.forEach(word => {
      if (!clientNames.some(clientName => clientName.includes(word) || word.includes(clientName))) {
        // Solo agregar si no es producto (para evitar falsos positivos)
        if (!productNames.some(productName => productName.includes(word) || word.includes(productName))) {
          unknownWordsFound.push({
            word,
            type: 'unknown-client'
          });
        }
      }
    });
    
    // Comprobar nombres de productos
    otherWords.forEach(word => {
      if (!productNames.some(productName => productName.includes(word) || word.includes(productName))) {
        // Solo agregar si no es cliente (para evitar falsos positivos)
        if (!clientNames.some(clientName => clientName.includes(word) || word.includes(clientName))) {
          unknownWordsFound.push({
            word,
            type: 'unknown-product'
          });
        }
      }
    });
    
    setUnknownWords(unknownWordsFound);
  }, [stringValue, clients, products, clientNames, productNames, highlightUnknownWords]);
  
  // Función para resaltar palabras desconocidas
  const highlightText = () => {
    if (!stringValue || unknownWords.length === 0) {
      return stringValue;
    }
    
    let highlightedText = stringValue;
    const spans: JSX.Element[] = [];
    
    // Construir una expresión regular para buscar todas las palabras desconocidas
    const escapedWords = unknownWords.map(item => item.word.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&'));
    const regex = new RegExp(`\\b(${escapedWords.join('|')})\\b`, 'gi');
    
    // Reemplazar las palabras desconocidas con spans rojos
    return highlightedText.replace(regex, (match) => {
      return `<span class="text-red-500 font-medium">${match}</span>`;
    });
  };
  
  return (
    <div className="relative w-full">
      <Textarea
        value={stringValue}
        onChange={onChange}
        className={cn(
          clearable && stringValue && "pr-10",
          className
        )}
        {...props}
      />
      
      {unknownWords.length > 0 && (
        <div 
          className="absolute inset-0 pointer-events-none bg-transparent"
          dangerouslySetInnerHTML={{ 
            __html: highlightText() 
          }} 
        />
      )}
      
      {clearable && stringValue && (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="absolute right-2 top-2 h-7 w-7 rounded-full opacity-70 hover:opacity-100 transition-opacity"
          onClick={onClear}
          tabIndex={-1}
          aria-label="Borrar texto"
        >
          <X className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
};
