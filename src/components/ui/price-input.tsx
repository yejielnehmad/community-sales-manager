
import { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { formatNumber, unformatNumber } from "@/lib/format";

interface PriceInputProps extends Omit<React.ComponentProps<typeof Input>, 'onChange' | 'value'> {
  value: number;
  onChange: (value: number) => void;
}

/**
 * Input para precios que formatea automáticamente con puntos mientras se escribe
 * Versión 1.0.5
 */
export function PriceInput({ value, onChange, className, ...props }: PriceInputProps) {
  const [displayValue, setDisplayValue] = useState<string>("");
  const [isFocused, setIsFocused] = useState<boolean>(false);
  const inputRef = useRef<HTMLInputElement>(null);
  
  // Actualizar el valor mostrado cuando cambia el valor o el estado de foco
  useEffect(() => {
    // Formatear el valor con puntos pero mantener el valor numérico internamente
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
    
    // Eliminar todos los puntos para obtener solo los dígitos
    const digitsOnly = rawValue.replace(/\./g, '');
    
    // Solo permitir dígitos
    if (!/^\d*$/.test(digitsOnly)) {
      return;
    }
    
    // Convertir a número
    const numericValue = parseInt(digitsOnly, 10);
    
    if (isNaN(numericValue)) {
      return;
    }
    
    // Formatear para mostrar con puntos mientras se escribe
    const formattedValue = formatNumber(numericValue);
    setDisplayValue(formattedValue);
    
    // Enviar el valor numérico al padre (sin formateo)
    onChange(numericValue);
    
    // Mantener la posición del cursor ajustada después del formateo
    setTimeout(() => {
      if (inputRef.current) {
        // Calcular posición ajustada del cursor
        const cursorPos = e.target.selectionStart || 0;
        const lengthDiff = formattedValue.length - rawValue.length;
        const newCursorPos = Math.max(0, cursorPos + lengthDiff);
        
        // Solo establecer si es diferente para evitar saltos del cursor
        if (inputRef.current.selectionStart !== newCursorPos) {
          inputRef.current.selectionStart = newCursorPos;
          inputRef.current.selectionEnd = newCursorPos;
        }
      }
    }, 0);
  };

  // Cuando el input recibe el foco
  const handleFocus = () => {
    setIsFocused(true);
  };

  // Cuando el input pierde el foco
  const handleBlur = () => {
    setIsFocused(false);
    // Asegurar que el valor mostrado está correctamente formateado
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
