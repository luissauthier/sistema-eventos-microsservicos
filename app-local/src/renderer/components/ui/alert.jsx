import * as React from "react"
import { cn } from "../../../lib/utils"

export function Alert({ variant = "default", className, ...props }) {
  const variants = {
    default: "bg-bg-soft text-text border-border",
    destructive: "bg-danger-soft text-danger border-danger",
    success: "bg-success-soft text-success border-success",
    warning: "bg-warning-soft text-warning border-warning",
  }

  return (
    <div
      role="alert"
      className={cn(
        "rounded-base border p-4 text-sm flex items-center gap-3",
        variants[variant],
        className
      )}
      {...props}
    />
  )
}