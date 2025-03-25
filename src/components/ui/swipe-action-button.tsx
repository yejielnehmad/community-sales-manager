
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
  
  return (
    <button 
      className={cn(
        "h-full w-full flex items-center justify-center transition-colors",
        variantClasses[variant],
        disabled && "opacity-50 cursor-not-allowed",
        className
      )}
      onClick={(e) => {
        e.stopPropagation(); // Evitar la propagación del evento
        if (!disabled) onClick();
      }}
      disabled={disabled}
      aria-label={label}
    >
      {icon}
    </button>
  );
};
