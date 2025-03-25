
import { useState, useCallback, useRef, useEffect } from 'react';
import type { MouseEvent as ReactMouseEvent, TouchEvent as ReactTouchEvent } from 'react';

export interface SwipeOptions {
  threshold?: number;
  maxSwipe?: number;
  onSwipeStart?: () => void;
  onSwipeMove?: (x: number) => void;
  onSwipeEnd?: (completed: boolean) => void;
  disabled?: boolean;
}

export function useSwipe(options: SwipeOptions = {}) {
  const {
    threshold = 20,
    maxSwipe = -140,
    onSwipeStart,
    onSwipeMove,
    onSwipeEnd,
    disabled = false
  } = options;

  const [swipeX, setSwipeX] = useState(0);
  const startXRef = useRef<number | null>(null);
  const currentXRef = useRef<number | null>(null);
  const isActiveRef = useRef(false);

  // Reiniciar el swipe cuando se deshabilita
  useEffect(() => {
    if (disabled && swipeX !== 0) {
      resetSwipe();
    }
  }, [disabled]);

  const handleSwipeStart = useCallback((clientX: number) => {
    if (disabled) return;
    
    startXRef.current = clientX;
    currentXRef.current = clientX;
    isActiveRef.current = true;
    setSwipeX(0);
    onSwipeStart?.();
  }, [disabled, onSwipeStart]);

  const handleSwipeMove = useCallback((clientX: number) => {
    if (disabled || !isActiveRef.current || startXRef.current === null) return;
    
    currentXRef.current = clientX;
    const deltaX = currentXRef.current - startXRef.current;
    
    // Solo permitir deslizamiento hacia la izquierda
    if (deltaX <= 0) {
      // Limitar el deslizamiento entre 0 y maxSwipe
      const newSwipeX = Math.max(maxSwipe, Math.min(0, deltaX));
      setSwipeX(newSwipeX);
      
      // Llamar al callback onSwipeMove si existe
      onSwipeMove?.(newSwipeX);
    }
  }, [disabled, maxSwipe, onSwipeMove]);

  const handleSwipeEnd = useCallback(() => {
    if (disabled || !isActiveRef.current || startXRef.current === null || currentXRef.current === null) return;
    
    const deltaX = currentXRef.current - startXRef.current;
    let completed = false;
    
    // Si el deslizamiento es más de la mitad, completar el deslizamiento
    if (deltaX < -Math.abs(maxSwipe) / 2) {
      setSwipeX(maxSwipe);
      completed = true;
    } 
    // De lo contrario, volver a la posición inicial
    else {
      setSwipeX(0);
    }
    
    startXRef.current = null;
    currentXRef.current = null;
    isActiveRef.current = false;
    
    onSwipeEnd?.(completed);
  }, [disabled, maxSwipe, onSwipeEnd]);

  const resetSwipe = useCallback(() => {
    setSwipeX(0);
    startXRef.current = null;
    currentXRef.current = null;
    isActiveRef.current = false;
  }, []);

  // Props para eventos de mouse con tipos correctos de React
  const getMouseProps = useCallback(() => ({
    onMouseDown: (e: ReactMouseEvent) => handleSwipeStart(e.clientX),
    onMouseMove: (e: ReactMouseEvent) => handleSwipeMove(e.clientX),
    onMouseUp: () => handleSwipeEnd(),
    onMouseLeave: () => handleSwipeEnd(),
  }), [handleSwipeStart, handleSwipeMove, handleSwipeEnd]);

  // Props para eventos táctiles con tipos correctos de React
  const getTouchProps = useCallback(() => ({
    onTouchStart: (e: ReactTouchEvent) => handleSwipeStart(e.touches[0].clientX),
    onTouchMove: (e: ReactTouchEvent) => handleSwipeMove(e.touches[0].clientX),
    onTouchEnd: () => handleSwipeEnd(),
    onTouchCancel: () => handleSwipeEnd(),
  }), [handleSwipeStart, handleSwipeMove, handleSwipeEnd]);

  return {
    swipeX,
    resetSwipe,
    getMouseProps,
    getTouchProps,
    isActive: swipeX !== 0 || isActiveRef.current
  };
}
