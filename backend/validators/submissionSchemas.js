import { z } from "zod";

const objectIdRegex = /^[a-f\d]{24}$/i;

export const createOrUpdateSubmissionSchema = z.object({
  body: z.object({
    projectId: z.string().regex(objectIdRegex, "Invalid project id"),
    content: z.string().trim().min(1).max(40000),
    fileUrl: z.string().trim().max(2000).optional(),
  }),
  query: z.object({}).passthrough(),
  params: z.object({}).passthrough(),
});

export const getSubmissionsByProjectSchema = z.object({
  body: z.object({}).passthrough(),
  query: z.object({}).passthrough(),
  params: z.object({
    projectId: z.string().regex(objectIdRegex, "Invalid project id"),
  }),
});

export const submitSubmissionSchema = z.object({
  body: z.object({}).passthrough(),
  query: z.object({}).passthrough(),
  params: z.object({
    submissionId: z.string().regex(objectIdRegex, "Invalid submission id"),
  }),
});

export const convertSubmissionToWordSchema = z.object({
  body: z.object({}).passthrough(),
  query: z.object({}).passthrough(),
  params: z.object({
    submissionId: z.string().regex(objectIdRegex, "Invalid submission id"),
  }),
});

export const reviewSubmissionSchema = z.object({
  body: z.object({
    status: z
      .enum(["APPROVED", "REJECTED"])
      .refine((val) => val !== undefined, "Status is required"),
    feedback: z.string().trim().max(5000).optional().default(""),
  }),
  query: z.object({}).passthrough(),
  params: z.object({
    submissionId: z.string().regex(objectIdRegex, "Invalid submission id"),
  }),
});