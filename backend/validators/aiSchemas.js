import { z } from "zod";

export const generateProjectDescriptionSchema = z
  .object({
    body: z.object({
      title: z.string().trim().max(160).optional(),
      requirements: z.string().trim().max(6000).optional(),
      domain: z.string().trim().max(120).optional(),
    }),
    query: z.object({}).passthrough(),
    params: z.object({}).passthrough(),
  })
  .superRefine((value, ctx) => {
    if (!value.body.title && !value.body.requirements && !value.body.domain) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["body", "title"],
        message: "Provide at least one input field",
      });
    }
  });

export const generateContentSchema = z
  .object({
    body: z.object({
      projectTitle: z.string().trim().max(160).optional(),
      projectDescription: z.string().trim().max(4000).optional(),
      prompt: z.string().trim().max(2000).optional(),
      tone: z.string().trim().max(60).optional(),
    }),
    query: z.object({}).passthrough(),
    params: z.object({}).passthrough(),
  })
  .superRefine((value, ctx) => {
    if (!value.body.projectTitle && !value.body.projectDescription && !value.body.prompt) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["body", "prompt"],
        message: "Provide at least one input field",
      });
    }
  });