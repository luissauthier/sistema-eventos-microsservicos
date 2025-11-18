import * as React from "react"
import { cn } from "../../../lib/utils"

export const Input = React.forwardRef(({ className, ...props }, ref) => {
  return (
    <input
      ref={ref}
      className={cn(
        "flex h-10 w-full rounded-base border border-border bg-bg-soft px-4 text-text placeholder:text-text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
        className
      )}
      {...props}
    />
  )
})

Input.displayName = "Input"