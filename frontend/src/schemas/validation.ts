import type { TFunction } from "i18next";
import * as z from "zod";

// Form validation schemas
export const formSchema = (t: TFunction) =>
  z.object({
    mwp: z.string().min(1, { message: t("forms.mwpRequired") }),
    formula: z.string().optional(),
    hint: z.string().optional(),
  });

export const vlFormSchema = (t: TFunction) =>
  z.object({
    dsl: z.string().min(1, { message: t("forms.dslRequired") }),
  });

// Export inferred types for convenience
export type FormData = z.infer<ReturnType<typeof formSchema>>;
export type VLFormData = z.infer<ReturnType<typeof vlFormSchema>>;