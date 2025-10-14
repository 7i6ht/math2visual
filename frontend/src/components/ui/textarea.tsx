import * as React from "react"

import { cn } from "@/lib/utils"

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "border-input placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive dark:bg-input/30 flex field-sizing-content min-h-16 md:min-h-20 lg:min-h-24 xl:min-h-28 2xl:min-h-32 w-full rounded-md border bg-transparent px-3 py-2 md:px-4 md:py-3 lg:px-5 lg:py-4 xl:px-6 xl:py-5 text-xs md:text-sm lg:text-base xl:text-lg 2xl:text-xl shadow-xs transition-[color,box-shadow] outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      {...props}
    />
  )
}

export { Textarea }
