import csurf from "csurf";
import { csrfCookieOptions } from "../config/security.js";

const csrfProtection = csurf({
  cookie: csrfCookieOptions,
});

const isCsrfError = (err) => err?.code === "EBADCSRFTOKEN";

export { csrfProtection, isCsrfError };
