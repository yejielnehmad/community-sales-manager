
import * as React from "react"
import * as PopoverPrimitive from "@radix-ui/react-popover"

import { cn } from "@/lib/utils"

const Popover = PopoverPrimitive.Root

const PopoverTrigger = PopoverPrimitive.Trigger

const PopoverContent = React.forwardRef<
  React.ElementRef<typeof PopoverPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof PopoverPrimitive.Content>
>(({ className, align = "center", sideOffset = 4, ...props }, ref) => {
  React.useEffect(() => {
    return () => {
      // Asegurar que los estilos se restablezcan cuando se desmonte
      document.body.style.overflow = '';
      document.body.style.touchAction = '';
      document.body.style.pointerEvents = '';
      
      // Eliminar cualquier clase de bloqueo que pueda haberse quedado
      document.documentElement.classList.remove('overflow-hidden');
    }
  }, []);
  
  return (
    <PopoverPrimitive.Portal>
      <PopoverPrimitive.Content
        ref={ref}
        align={align}
        sideOffset={sideOffset}
        className={cn(
          "z-50 w-72 rounded-md border bg-popover p-4 text-popover-foreground shadow-md outline-none animate-in data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
          className
        )}
        onOpenAutoFocus={(e) => {
          e.preventDefault(); // Evita que el foco automático cause problemas
        }}
        onCloseAutoFocus={(e) => {
          e.preventDefault(); // Evita que el foco automático al cerrar cause problemas
          
          // Restaurar estilos al cerrar
          document.body.style.overflow = '';
          document.body.style.touchAction = '';
          document.body.style.pointerEvents = '';
          
          // Eliminar cualquier clase de bloqueo que pueda haberse quedado
          document.documentElement.classList.remove('overflow-hidden');
          
          // Forzar un reflow para asegurar que los cambios se apliquen
          void document.documentElement.offsetHeight;
        }}
        onEscapeKeyDown={() => {
          // Asegurar que los estilos se restablezcan al cerrar con ESC
          document.body.style.overflow = '';
          document.body.style.touchAction = '';
          document.body.style.pointerEvents = '';
          
          // Eliminar cualquier clase de bloqueo que pueda haberse quedado
          document.documentElement.classList.remove('overflow-hidden');
          
          // Forzar un reflow para asegurar que los cambios se apliquen
          void document.documentElement.offsetHeight;
        }}
        {...props}
      />
    </PopoverPrimitive.Portal>
  )
})
PopoverContent.displayName = PopoverPrimitive.Content.displayName

export { Popover, PopoverTrigger, PopoverContent }
