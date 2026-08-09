import { z } from "zod";

const tokenRegex = /^[a-f0-9]{64}$/i;

const nonEmptyBody = z.object({}).passthrough();
const nonEmptyQuery = z.object({}).passthrough();

export const loginSchema = z.object({
  body: z.object({
    email: z.string().trim().min(1).max(254),
    password: z.string().min(1).max(128),
  }),
  query: nonEmptyQuery,
  params: z.object({}).passthrough(),
});

export const verifyUserSchema = z.object({
  body: z.object({
    token: z.string().regex(tokenRegex, "Invalid invite token format"),
    password: z.string().min(8).max(128),
  }),
  query: nonEmptyQuery,
  params: z.object({}).passthrough(),
});

export const verifyLinkSchema = z.object({
  body: nonEmptyBody,
  query: nonEmptyQuery,
  params: z.object({
    token: z.string().regex(tokenRegex, "Invalid invite token format"),
  }),
});

export const registerAdminSchema = z.object({
  body: z.object({
    name: z.string().trim().min(2).max(80),
    email: z.string().email(),
    password: z.string().min(8).max(128),
    secret: z.string().min(1),
  }),
  query: nonEmptyQuery,
  params: z.object({}).passthrough(),
});
