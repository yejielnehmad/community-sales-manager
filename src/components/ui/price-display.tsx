
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
 * v1.0.10
 */
export function PriceDisplay({ value, className = "", noPrefix = false }: PriceDisplayProps) {
  try {
    return (
      <span className={className}>
        {noPrefix ? formatPrice(value).replace('$', '') : formatPrice(value)}
      </span>
    );
  } catch (error) {
    console.error("Error al formatear precio en PriceDisplay:", error);
    return <span className={className}>{noPrefix ? '0' : '$0'}</span>;
  }
}
