
import * as React from "react"
import { X } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "./button"

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  clearable?: boolean;
  onClear?: () => void;
}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, clearable = false, onClear, ...props }, ref) => {
    return (
      <div className="relative w-full">
        <textarea
          className={cn(
            "flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
            clearable && props.value && "pr-10",
            className
          )}
          ref={ref}
          {...props}
        />
        {clearable && props.value && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="absolute right-2 top-2 h-7 w-7 rounded-full opacity-70 hover:opacity-100 transition-opacity"
            onClick={onClear}
            tabIndex={-1}
            aria-label="Borrar texto"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>
    )
  }
)
Textarea.displayName = "Textarea"

export { Textarea }
