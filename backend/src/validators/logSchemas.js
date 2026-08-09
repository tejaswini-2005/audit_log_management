import { z } from "zod";

const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const getMyLogsSchema = z.object({
  body: z.object({}).passthrough(),
  params: z.object({}).passthrough(),
  query: paginationSchema,
});

export const getAllLogsSchema = z.object({
  body: z.object({}).passthrough(),
  params: z.object({}).passthrough(),
  query: paginationSchema.extend({
    email: z.string().email().optional(),
    action: z.string().trim().min(1).max(64).optional(),
    from: z.string().regex(dateRegex, "from must be YYYY-MM-DD").optional(),
    to: z.string().regex(dateRegex, "to must be YYYY-MM-DD").optional(),
  }),
});
