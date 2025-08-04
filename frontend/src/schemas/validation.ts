import * as z from "zod";

// Form validation schemas
export const formSchema = z.object({
  mwp: z.string().min(1, "Please enter a math word problem"),
  formula: z.string().optional(),
});

export const vlFormSchema = z.object({
  dsl: z.string().min(1, "Visual language cannot be empty"),
});

// Export inferred types for convenience
export type FormData = z.infer<typeof formSchema>;
export type VLFormData = z.infer<typeof vlFormSchema>; 