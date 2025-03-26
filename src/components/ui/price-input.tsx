
import { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { formatNumber, unformatNumber } from "@/lib/format";

interface PriceInputProps extends Omit<React.ComponentProps<typeof Input>, 'onChange' | 'value'> {
  value: number;
  onChange: (value: number) => void;
}

/**
 * Input para precios que formatea automáticamente con puntos mientras se escribe
 * Versión 1.0.6
 */
export function PriceInput({ value, onChange, className, ...props }: PriceInputProps) {
  const [displayValue, setDisplayValue] = useState<string>("");
  const [isFocused, setIsFocused] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  
  // Actualizar el valor mostrado cuando cambia el valor externo
  useEffect(() => {
    // Actualizar solo si el valor ha cambiado significativamente para evitar problemas de cursor
    if (unformatNumber(displayValue) !== value) {
      setDisplayValue(formatNumber(value));
    }
  }, [value]);
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value;
    
    // Si está vacío, establecer a 0
    if (!rawValue) {
      setDisplayValue("");
      onChange(0);
      setError(null);
      return;
    }
    
    // Eliminar todos los puntos para validar solo los dígitos
    const digitsOnly = rawValue.replace(/\./g, '');
    
    // Solo permitir dígitos
    if (!/^\d+$/.test(digitsOnly)) {
      setError("Solo se permiten números");
      return;
    }
    
    setError(null);
    
    try {
      // Mantener la posición del cursor antes de formatear
      const cursorPos = e.target.selectionStart || 0;
      const dotsBefore = (rawValue.substring(0, cursorPos).match(/\./g) || []).length;
      
      // Convertir a número (usar parseInt para evitar problemas con números grandes)
      const numericValue = parseInt(digitsOnly, 10);
      
      if (isNaN(numericValue)) {
        setDisplayValue("");
        onChange(0);
        return;
      }
      
      // Formatear para mostrar con puntos mientras se escribe
      const formattedValue = formatNumber(numericValue);
      setDisplayValue(formattedValue);
      
      // Enviar el valor numérico al padre (sin formateo)
      onChange(numericValue);
      
      // Ajustar la posición del cursor después del formateo
      setTimeout(() => {
        if (inputRef.current) {
          // Calcular cuántos puntos hay en la nueva posición
          const dotsAfter = (formattedValue.substring(0, cursorPos).match(/\./g) || []).length;
          // Ajustar la posición del cursor teniendo en cuenta los puntos añadidos/eliminados
          const newCursorPos = cursorPos + (dotsAfter - dotsBefore);
          
          inputRef.current.setSelectionRange(newCursorPos, newCursorPos);
        }
      }, 0);
    } catch (error) {
      console.error("Error al procesar el precio:", error);
      setError("Error al procesar el valor");
    }
  };

  // Cuando el input recibe el foco
  const handleFocus = () => {
    setIsFocused(true);
    setError(null);
  };

  // Cuando el input pierde el foco
  const handleBlur = () => {
    setIsFocused(false);
    
    try {
      // Asegurar que el valor mostrado está correctamente formateado
      const numericValue = unformatNumber(displayValue);
      setDisplayValue(formatNumber(numericValue));
      onChange(numericValue);
    } catch (error) {
      console.error("Error al formatear en blur:", error);
      setError("Error al formatear el valor");
    }
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
    <div className="relative flex flex-col">
      <div className="relative flex items-center">
        <span className="absolute left-3 text-muted-foreground">$</span>
        <Input
          ref={inputRef}
          type="text"
          inputMode="numeric"
          value={displayValue}
          onChange={handleChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          className={`pl-7 ${error ? 'border-red-500' : ''} ${className}`}
          {...props}
        />
      </div>
      {error && (
        <span className="text-xs text-red-500 mt-1">{error}</span>
      )}
    </div>
  );
}
