import { z } from "zod";

const objectIdRegex = /^[a-f\d]{24}$/i;

const projectStatus = z.enum([
  "CREATED",
  "ASSIGNED",
  "IN_PROGRESS",
  "SUBMITTED",
  "APPROVED",
  "COMPLETED",
  "REJECTED",
]);

export const createProjectSchema = z.object({
  body: z.object({
    title: z.string().trim().min(3).max(160),
    description: z.string().trim().min(8).max(4000),
    requirements: z.string().trim().max(6000).optional(),
    assignedTo: z.string().trim().min(1).max(255).optional(),
    status: projectStatus.optional(),
  }),
  query: z.object({}).passthrough(),
  params: z.object({}).passthrough(),
});

export const assignProjectSchema = z.object({
  body: z.object({
    userEmail: z.string().trim().email("Invalid email address"),
  }),
  query: z.object({}).passthrough(),
  params: z.object({
    id: z.string().regex(objectIdRegex, "Invalid project id"),
  }),
});

export const acceptProjectSchema = z.object({
  body: z.object({}).passthrough(),
  query: z.object({}).passthrough(),
  params: z.object({
    id: z.string().regex(objectIdRegex, "Invalid project id"),
  }),
});

export const listProjectsSchema = z.object({
  body: z.object({}).passthrough(),
  params: z.object({}).passthrough(),
  query: z.object({
    status: projectStatus.optional(),
    assignedTo: z.string().regex(objectIdRegex, "Invalid assigned user id").optional(),
    search: z.string().trim().min(1).max(120).optional(),
  }),
});

export const getProjectByIdSchema = z.object({
  body: z.object({}).passthrough(),
  query: z.object({}).passthrough(),
  params: z.object({
    id: z.string().regex(objectIdRegex, "Invalid project id"),
  }),
});
