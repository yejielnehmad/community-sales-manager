
import { useCallback, useEffect, useState } from "react"

export function useIsMobile(breakpoint: number = 768) {
  const checkIsMobile = useCallback(() => {
    return window.innerWidth < breakpoint
  }, [breakpoint])

  const [isMobile, setIsMobile] = useState<boolean>(checkIsMobile)

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(checkIsMobile())
    }

    // Set the initial value
    handleResize()

    window.addEventListener("resize", handleResize)
    return () => {
      window.removeEventListener("resize", handleResize)
    }
  }, [checkIsMobile])

  return isMobile
}
