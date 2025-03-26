
import React from 'react';
import { cn } from "@/lib/utils";
import { logUserAction } from "@/lib/debug-utils";

interface SwipeActionButtonProps {
  className?: string;
  onClick: () => void;
  disabled?: boolean;
  icon: React.ReactNode;
  label: string;
  variant?: 'destructive' | 'warning' | 'default';
  testId?: string;
}

/**
 * Componente de botón para acciones de deslizamiento
 * v1.0.6
 */
export const SwipeActionButton = ({
  className,
  onClick,
  disabled = false,
  icon,
  label,
  variant = 'default',
  testId
}: SwipeActionButtonProps) => {
  const variantClasses = {
    destructive: "bg-red-500 hover:bg-red-600 text-white",
    warning: "bg-amber-500 hover:bg-amber-600 text-white",
    default: "bg-primary hover:bg-primary/90 text-primary-foreground"
  };
  
  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!disabled) {
      // Registro de la acción del usuario
      logUserAction(`Botón ${label} pulsado`, { variant });
      onClick();
    }
  };
  
  return (
    <button 
      className={cn(
        "h-full w-full flex items-center justify-center transition-colors",
        variantClasses[variant],
        disabled && "opacity-50 cursor-not-allowed",
        className
      )}
      onClick={handleClick}
      disabled={disabled}
      aria-label={label}
      data-testid={testId || "swipe-action-button"}
    >
      {icon}
    </button>
  );
};
