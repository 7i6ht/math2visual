import * as React from "react"

import { cn } from "@/lib/utils"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      className={cn(
        "border-input placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive dark:bg-input/30 flex h-10 md:h-12 lg:h-14 xl:h-16 2xl:h-18 w-full rounded-md border bg-transparent px-3 py-2 md:px-4 md:py-3 lg:px-5 lg:py-4 xl:px-6 xl:py-5 text-xs md:text-sm lg:text-base xl:text-lg 2xl:text-xl shadow-xs transition-[color,box-shadow] outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      {...props}
    />
  )
}

export { Input } 