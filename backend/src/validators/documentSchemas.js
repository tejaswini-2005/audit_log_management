import { z } from "zod";

const objectIdRegex = /^[a-f\d]{24}$/i;

/**
 * Schema for generating PDF document
 */
export const generatePdfSchema = z.object({
  body: z.object({
    content: z
      .string()
      .trim()
      .min(1, "Content cannot be empty")
      .max(40000, "Content exceeds maximum length"),
    projectId: z
      .string()
      .regex(objectIdRegex, "Invalid project id"),
  }).strict(),
  query: z.object({}).passthrough(),
  params: z.object({}).passthrough(),
});

/**
 * Schema for generating Word document
 */
export const generateWordSchema = z.object({
  body: z.object({
    content: z
      .string()
      .trim()
      .min(1, "Content cannot be empty")
      .max(40000, "Content exceeds maximum length"),
    projectId: z
      .string()
      .regex(objectIdRegex, "Invalid project id"),
  }).strict(),
  query: z.object({}).passthrough(),
  params: z.object({}).passthrough(),
});

/**
 * Schema for generating both PDF and Word documents
 */
export const generateBothDocumentsSchema = z.object({
  body: z.object({
    content: z
      .string()
      .trim()
      .min(1, "Content cannot be empty")
      .max(40000, "Content exceeds maximum length"),
    projectId: z
      .string()
      .regex(objectIdRegex, "Invalid project id"),
  }).strict(),
  query: z.object({}).passthrough(),
  params: z.object({}).passthrough(),
});

/**
 * Schema for getting submission documents
 */
export const getSubmissionDocumentsSchema = z.object({
  body: z.object({}).passthrough(),
  query: z.object({}).passthrough(),
  params: z.object({
    submissionId: z
      .string()
      .regex(objectIdRegex, "Invalid submission id"),
  }),
});
