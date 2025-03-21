
import { useCallback, useEffect, useState } from "react"

/**
 * Hook para detectar si el dispositivo es móvil basado en el ancho de la pantalla
 * @param breakpoint El punto de quiebre en píxeles (por defecto 768px)
 * @returns Boolean indicando si es móvil
 */
export function useIsMobile(breakpoint: number = 768) {
  const checkIsMobile = useCallback(() => {
    // Verificamos si window está definido (para SSR)
    if (typeof window === 'undefined') return false
    return window.innerWidth < breakpoint
  }, [breakpoint])

  const [isMobile, setIsMobile] = useState<boolean>(checkIsMobile())

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(checkIsMobile())
    }

    // Aseguramos que se actualice al cargar y al redimensionar
    handleResize()

    window.addEventListener("resize", handleResize)
    return () => {
      window.removeEventListener("resize", handleResize)
    }
  }, [checkIsMobile])

  return isMobile
}
