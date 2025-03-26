
import { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { formatNumber, unformatNumber } from "@/lib/format";

interface PriceInputProps extends Omit<React.ComponentProps<typeof Input>, 'onChange' | 'value'> {
  value: number;
  onChange: (value: number) => void;
}

/**
 * Input para precios que formatea automáticamente con puntos mientras se escribe
 * Versión 1.0.4
 */
export function PriceInput({ value, onChange, className, ...props }: PriceInputProps) {
  const [displayValue, setDisplayValue] = useState<string>("");
  const [isFocused, setIsFocused] = useState<boolean>(false);
  const inputRef = useRef<HTMLInputElement>(null);
  
  // Actualizar el valor mostrado cuando cambia el valor o el estado de foco
  useEffect(() => {
    // Si el input está enfocado, mostramos el valor sin formato
    // Si no está enfocado, aplicamos el formato con puntos
    if (isFocused) {
      // Cuando está enfocado, mostramos el valor sin puntos
      setDisplayValue(value.toString());
    } else {
      // Cuando no está enfocado, mostramos el valor con formato
      setDisplayValue(formatNumber(value));
    }
  }, [value, isFocused]);
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value;
    
    // Si está vacío, establecer a 0
    if (!rawValue) {
      setDisplayValue("");
      onChange(0);
      return;
    }
    
    // Solo permitir dígitos
    if (!/^\d*$/.test(rawValue)) {
      return;
    }
    
    // Actualizar el valor mostrado sin formatear
    setDisplayValue(rawValue);
    
    // Convertir a número y enviar el valor numérico al padre
    const numericValue = parseInt(rawValue, 10);
    onChange(isNaN(numericValue) ? 0 : numericValue);
  };

  // Cuando el input recibe el foco
  const handleFocus = () => {
    setIsFocused(true);
    // Mostrar el valor sin formato cuando recibe el foco
    setDisplayValue(value.toString());
  };

  // Cuando el input pierde el foco
  const handleBlur = () => {
    setIsFocused(false);
    // Aplicar formato con puntos cuando pierde el foco
    setDisplayValue(formatNumber(value));
  };

  // Método para hacer focus en el input
  const focus = () => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };
  
  // Exponer el método focus
  useEffect(() => {
    if (inputRef.current) {
      (inputRef.current as any).focus = focus;
    }
  }, []);
  
  return (
    <div className="relative flex items-center">
      <span className="absolute left-3 text-muted-foreground">$</span>
      <Input
        ref={inputRef}
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        value={displayValue}
        onChange={handleChange}
        onFocus={handleFocus}
        onBlur={handleBlur}
        className={`pl-7 ${className}`}
        {...props}
      />
    </div>
  );
}
