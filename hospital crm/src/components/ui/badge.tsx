import * as React from "react"
import { cn } from "@/lib/utils"

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?:
    | "default"
    | "secondary"
    | "destructive"
    | "outline"
    | "scheduled"
    | "confirmed"
    | "inprogress"
    | "completed"
    | "cancelled"
}

const Badge = React.forwardRef<HTMLDivElement, BadgeProps>(
  ({ className, variant = "default", ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-hidden focus:ring-2 focus:ring-ring focus:ring-offset-2",
          {
            "border-transparent bg-primary text-primary-foreground shadow-xs": variant === "default",
            "border-transparent bg-secondary text-secondary-foreground shadow-xs": variant === "secondary",
            "border-transparent bg-destructive text-destructive-foreground shadow-xs": variant === "destructive",
            "border-border bg-background text-foreground": variant === "outline",
            
            // Medical Status variants
            "border-transparent bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300": variant === "scheduled",
            "border-transparent bg-sky-100 text-sky-800 dark:bg-sky-900/30 dark:text-sky-300": variant === "confirmed",
            "border-transparent bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300": variant === "inprogress",
            "border-transparent bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300": variant === "completed",
            "border-transparent bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-300": variant === "cancelled",
          },
          className
        )}
        {...props}
      />
    )
  }
)
Badge.displayName = "Badge"

export { Badge }
