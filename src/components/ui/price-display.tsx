
import { formatPrice } from "@/lib/format";
import { logError } from "@/lib/debug-utils";

interface PriceDisplayProps {
  value: number | string;
  className?: string;
  /**
   * Si es true, no mostrará el prefijo "$"
   */
  noPrefix?: boolean;
}

/**
 * Componente para mostrar precios formateados con puntos como separadores de miles
 * v1.0.13
 */
export function PriceDisplay({ value, className = "", noPrefix = false }: PriceDisplayProps) {
  try {
    // Validar que valor sea un número válido
    const numValue = typeof value === 'string' ? parseFloat(value) : value;
    
    if (isNaN(numValue)) {
      logError('PriceDisplay', `Valor no numérico: ${value}`);
      return <span className={`${className} text-red-500`}>
        {noPrefix ? 'Error' : '$Error'}
      </span>;
    }
    
    return (
      <span className={className}>
        {noPrefix ? formatPrice(value).replace('$', '') : formatPrice(value)}
      </span>
    );
  } catch (error) {
    logError('PriceDisplay', error, { value });
    return <span className={`${className} text-red-500`}>
      {noPrefix ? '0' : '$0'}
    </span>;
  }
}
