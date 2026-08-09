import { z } from "zod";

const objectIdRegex = /^[a-f\d]{24}$/i;

export const extractTextSchema = z.object({
  body: z.object({
    projectId: z.string().regex(objectIdRegex, "Invalid project id"),
  }),
  query: z.object({}).passthrough(),
  params: z.object({}).passthrough(),
});