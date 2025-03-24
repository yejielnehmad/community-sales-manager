
import { useState, useCallback, useRef } from 'react';

interface SwipeOptions {
  threshold?: number;
  maxSwipe?: number;
  onSwipeStart?: () => void;
  onSwipeEnd?: (completed: boolean) => void;
}

export function useSwipe(options: SwipeOptions = {}) {
  const {
    threshold = 20,
    maxSwipe = -140,
    onSwipeStart,
    onSwipeEnd
  } = options;

  const [swipeX, setSwipeX] = useState(0);
  const startXRef = useRef<number | null>(null);
  const currentXRef = useRef<number | null>(null);

  const handleSwipeStart = useCallback((clientX: number) => {
    startXRef.current = clientX;
    currentXRef.current = clientX;
    onSwipeStart?.();
  }, [onSwipeStart]);

  const handleSwipeMove = useCallback((clientX: number) => {
    if (startXRef.current === null) return;
    
    currentXRef.current = clientX;
    const deltaX = currentXRef.current - startXRef.current;
    
    // Solo permitir deslizamiento hacia la izquierda
    if (deltaX <= 0) {
      // Limitar el deslizamiento entre 0 y maxSwipe
      const newSwipeX = Math.max(maxSwipe, Math.min(0, deltaX));
      setSwipeX(newSwipeX);
    }
  }, [maxSwipe]);

  const handleSwipeEnd = useCallback(() => {
    if (startXRef.current === null || currentXRef.current === null) return;
    
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
    
    onSwipeEnd?.(completed);
  }, [maxSwipe, onSwipeEnd]);

  const resetSwipe = useCallback(() => {
    setSwipeX(0);
    startXRef.current = null;
    currentXRef.current = null;
  }, []);

  // Props para eventos de mouse
  const getMouseProps = useCallback(() => ({
    onMouseDown: (e: React.MouseEvent) => handleSwipeStart(e.clientX),
    onMouseMove: (e: MouseEvent) => handleSwipeMove(e.clientX),
    onMouseUp: () => handleSwipeEnd(),
    onMouseLeave: () => handleSwipeEnd(),
  }), [handleSwipeStart, handleSwipeMove, handleSwipeEnd]);

  // Props para eventos táctiles
  const getTouchProps = useCallback(() => ({
    onTouchStart: (e: React.TouchEvent) => handleSwipeStart(e.touches[0].clientX),
    onTouchMove: (e: React.TouchEvent) => handleSwipeMove(e.touches[0].clientX),
    onTouchEnd: () => handleSwipeEnd(),
    onTouchCancel: () => handleSwipeEnd(),
  }), [handleSwipeStart, handleSwipeMove, handleSwipeEnd]);

  return {
    swipeX,
    resetSwipe,
    getMouseProps,
    getTouchProps,
    isActive: swipeX !== 0
  };
}
