
import { formatPrice } from "@/lib/format";

interface PriceDisplayProps {
  value: number | string;
  className?: string;
}

/**
 * Componente para mostrar precios formateados con puntos como separadores de miles
 * v1.0.1
 */
export function PriceDisplay({ value, className = "" }: PriceDisplayProps) {
  return (
    <span className={className}>
      {formatPrice(value)}
    </span>
  );
}
