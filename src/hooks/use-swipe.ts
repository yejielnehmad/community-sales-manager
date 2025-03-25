
import { useState, useCallback, useRef } from 'react';
import type { MouseEvent as ReactMouseEvent, TouchEvent as ReactTouchEvent } from 'react';

interface SwipeOptions {
  threshold?: number;
  maxSwipe?: number;
  onSwipeStart?: () => void;
  onSwipeMove?: (x: number) => void;
  onSwipeEnd?: (completed: boolean) => void;
}

export function useSwipe(options: SwipeOptions = {}) {
  const {
    threshold = 20,
    maxSwipe = -140,
    onSwipeStart,
    onSwipeMove,
    onSwipeEnd
  } = options;

  const [swipeX, setSwipeX] = useState(0);
  const startXRef = useRef<number | null>(null);
  const currentXRef = useRef<number | null>(null);

  const handleSwipeStart = useCallback((clientX: number) => {
    startXRef.current = clientX;
    currentXRef.current = clientX;
    setSwipeX(0); // Reiniciar el swipe al comenzar
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
      
      // Llamar al callback onSwipeMove si existe
      onSwipeMove?.(newSwipeX);
    }
  }, [maxSwipe, onSwipeMove]);

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

  // Props para eventos de mouse con tipos correctos de React
  const getMouseProps = useCallback(() => ({
    onMouseDown: (e: ReactMouseEvent) => handleSwipeStart(e.clientX),
    onMouseMove: (e: ReactMouseEvent) => {
      if (startXRef.current !== null) {
        handleSwipeMove(e.clientX);
      }
    },
    onMouseUp: () => handleSwipeEnd(),
    onMouseLeave: () => handleSwipeEnd(),
  }), [handleSwipeStart, handleSwipeMove, handleSwipeEnd]);

  // Props para eventos táctiles con tipos correctos de React
  const getTouchProps = useCallback(() => ({
    onTouchStart: (e: ReactTouchEvent) => handleSwipeStart(e.touches[0].clientX),
    onTouchMove: (e: ReactTouchEvent) => {
      if (startXRef.current !== null) {
        handleSwipeMove(e.touches[0].clientX);
      }
    },
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
