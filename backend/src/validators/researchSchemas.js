import { z } from "zod";

const objectIdRegex = /^[a-f\d]{24}$/i;
const nonEmptyQuery = z.object({}).passthrough();

const researchStatus = z.enum(["DRAFT", "SELECTED", "DISCARDED"]);

export const createResearchSchema = z.object({
  body: z.object({
    title: z.string().trim().min(3).max(160),
    description: z.string().trim().min(8).max(4000),
    tags: z.array(z.string().trim().min(1).max(40)).max(12).optional(),
    status: researchStatus.optional(),
  }),
  query: nonEmptyQuery,
  params: z.object({}).passthrough(),
});

export const aiGenerateResearchSchema = z
  .object({
    body: z.object({
      topic: z.string().trim().max(140).optional(),
      keywords: z.array(z.string().trim().min(1).max(40)).max(12).optional(),
      count: z.coerce.number().int().min(1).max(10).default(5),
    }),
    query: nonEmptyQuery,
    params: z.object({}).passthrough(),
  })
  .superRefine((value, ctx) => {
    if (!value.body.topic && (!value.body.keywords || value.body.keywords.length === 0)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["body", "topic"],
        message: "Provide topic or at least one keyword",
      });
    }
  });

export const listResearchSchema = z.object({
  body: z.object({}).passthrough(),
  params: z.object({}).passthrough(),
  query: z.object({
    status: researchStatus.optional(),
    search: z.string().trim().min(1).max(120).optional(),
  }),
});

export const patchResearchSchema = z
  .object({
    body: z
      .object({
        title: z.string().trim().min(3).max(160).optional(),
        description: z.string().trim().min(8).max(4000).optional(),
        tags: z.array(z.string().trim().min(1).max(40)).max(12).optional(),
        status: researchStatus.optional(),
      })
      .refine((value) => Object.keys(value).length > 0, {
        message: "At least one field is required",
      }),
    query: nonEmptyQuery,
    params: z.object({
      id: z.string().regex(objectIdRegex, "Invalid research id"),
    }),
  });

export const convertResearchToProjectSchema = z.object({
  body: z.object({
    requirements: z.string().trim().max(6000).optional(),
    assignedTo: z.string().regex(objectIdRegex, "Invalid assigned user id").optional(),
  }),
  query: nonEmptyQuery,
  params: z.object({
    id: z.string().regex(objectIdRegex, "Invalid research id"),
  }),
});
