import * as React from "react"
import { cn } from "../../../lib/utils"

export function Skeleton({ className, ...props }) {
  return (
    <div
      className={cn("animate-pulse rounded-base bg-bg-soft", className)}
      {...props}
    />
  )
}