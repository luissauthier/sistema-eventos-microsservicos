import * as React from "react"
import { cn } from "../../../lib/utils"

export function Card({ className, ...props }) {
  return (
    <div
      className={cn(
        "rounded-base border border-border bg-bg-card shadow-soft p-4",
        className
      )}
      {...props}
    />
  )
}