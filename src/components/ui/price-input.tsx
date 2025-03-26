
import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { formatNumber, unformatNumber } from "@/lib/format";

interface PriceInputProps extends Omit<React.ComponentProps<typeof Input>, 'onChange' | 'value'> {
  value: number;
  onChange: (value: number) => void;
}

/**
 * Input para precios que formatea automáticamente con puntos mientras se escribe
 * Versión 1.0.2
 */
export function PriceInput({ value, onChange, className, ...props }: PriceInputProps) {
  const [displayValue, setDisplayValue] = useState<string>("");
  
  // Actualizar el valor mostrado cuando cambia el valor
  useEffect(() => {
    setDisplayValue(formatNumber(value));
  }, [value]);
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value;
    
    // Si está vacío, establecer a 0
    if (!rawValue) {
      setDisplayValue("");
      onChange(0);
      return;
    }
    
    // Solo permitir dígitos y puntos
    if (!/^[\d.]*$/.test(rawValue)) {
      return;
    }
    
    // Eliminar los puntos y convertir a número
    const numericValue = unformatNumber(rawValue);
    
    // Formatear para mostrar con puntos
    setDisplayValue(formatNumber(numericValue));
    
    // Enviar el valor numérico al padre
    onChange(numericValue);
  };
  
  return (
    <div className="relative flex items-center">
      <span className="absolute left-3 text-muted-foreground">$</span>
      <Input
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        value={displayValue}
        onChange={handleChange}
        className={`pl-7 ${className}`}
        {...props}
      />
    </div>
  );
}
