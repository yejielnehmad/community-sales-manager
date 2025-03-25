
import { formatPrice } from "@/lib/format";

interface PriceDisplayProps {
  value: number | string;
  className?: string;
  showPrefix?: boolean;
}

/**
 * Componente para mostrar precios formateados con puntos como separadores de miles
 */
export function PriceDisplay({ 
  value, 
  className = "", 
  showPrefix = true 
}: PriceDisplayProps) {
  return (
    <span className={`${className} ${!showPrefix ? 'no-prefix' : ''}`}>
      {showPrefix ? '$' : ''}
      {formatPrice(value)}
    </span>
  );
}
