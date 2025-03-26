
import React from 'react';
import { cn } from "@/lib/utils";

interface SwipeActionButtonProps {
  className?: string;
  onClick: () => void;
  disabled?: boolean;
  icon: React.ReactNode;
  label: string;
  variant?: 'destructive' | 'warning' | 'default';
}

/**
 * Componente de botón para acciones de deslizamiento
 * v1.0.4
 */
export const SwipeActionButton = ({
  className,
  onClick,
  disabled = false,
  icon,
  label,
  variant = 'default'
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
      onClick();
    }
  };
  
  return (
    <button 
      className={cn(
        "h-full w-full flex items-center justify-center transition-colors",
        "absolute inset-0", // Asegura que cubra todo el espacio disponible
        variantClasses[variant],
        disabled && "opacity-50 cursor-not-allowed",
        className
      )}
      onClick={handleClick}
      disabled={disabled}
      aria-label={label}
      data-testid="swipe-action-button"
    >
      {icon}
    </button>
  );
};
