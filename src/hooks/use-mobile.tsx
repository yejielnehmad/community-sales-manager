
import { useCallback, useEffect, useState } from "react"

/**
 * Hook para detectar si el dispositivo es móvil basado en el ancho de la pantalla
 * @param breakpoint El punto de quiebre en píxeles (por defecto 768px)
 * @returns Boolean indicando si es móvil
 */
export function useIsMobile(breakpoint: number = 768) {
  const [isMobile, setIsMobile] = useState<boolean>(false);

  useEffect(() => {
    // Verificamos si window está definido (para SSR)
    if (typeof window === 'undefined') return;
    
    // Función para verificar el tamaño de la pantalla
    const checkIsMobile = () => {
      setIsMobile(window.innerWidth < breakpoint);
    };
    
    // Inicializamos el valor
    checkIsMobile();
    
    // Configuramos el listener para cambios de tamaño
    window.addEventListener("resize", checkIsMobile);
    
    // Limpiamos el listener al desmontar
    return () => {
      window.removeEventListener("resize", checkIsMobile);
    };
  }, [breakpoint]);

  return isMobile;
}
