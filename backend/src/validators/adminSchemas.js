import { z } from "zod";

const nonEmptyQuery = z.object({}).passthrough();
const nonEmptyParams = z.object({}).passthrough();

export const inviteUserSchema = z.object({
  body: z.object({
    name: z.string().trim().min(2).max(80),
    email: z.string().email(),
    role: z.enum(["USER", "ADMIN"]),
  }),
  query: nonEmptyQuery,
  params: nonEmptyParams,
});
