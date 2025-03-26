
import { formatPrice } from "@/lib/format";

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
 * v1.0.4
 */
export function PriceDisplay({ value, className = "", noPrefix = false }: PriceDisplayProps) {
  return (
    <span className={className}>
      {noPrefix ? formatPrice(value).replace('$', '') : formatPrice(value)}
    </span>
  );
}
