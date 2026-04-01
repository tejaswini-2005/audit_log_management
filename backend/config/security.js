const isProduction = process.env.NODE_ENV === "production";

const cookieName = process.env.AUTH_COOKIE_NAME || "token";

const tokenCookieOptions = {
  httpOnly: true,
  secure: isProduction,
  sameSite: "strict",
  maxAge: 24 * 60 * 60 * 1000,
  path: "/",
};

const clearCookieOptions = {
  httpOnly: true,
  secure: isProduction,
  sameSite: "strict",
  path: "/",
};

const csrfCookieOptions = {
  key: process.env.CSRF_COOKIE_NAME || "_csrf",
  httpOnly: true,
  secure: isProduction,
  sameSite: "strict",
  path: "/",
};

const defaultOrigins = [
  "http://localhost:5173",
  "http://localhost:5174",
  "http://localhost:5175",
];

const normalizeOrigin = (rawOrigin) => {
  const value = String(rawOrigin || "").trim();

  if (!value) {
    return "";
  }

  // Allow env vars without protocol (e.g. example.com) by assuming https.
  const withProtocol = /^https?:\/\//i.test(value)
    ? value
    : `https://${value}`;

  try {
    return new URL(withProtocol).origin;
  } catch {
    return "";
  }
};

const envOrigins = (
  process.env.CORS_ORIGINS ||
  process.env.FRONTEND_URL ||
  process.env.CLIENT_URL ||
  ""
)
  .split(",")
  .map(normalizeOrigin)
  .filter(Boolean);

const allowedOrigins = envOrigins.length > 0 ? envOrigins : defaultOrigins;

const isAllowedOrigin = (origin) => {
  if (!origin) {
    return true;
  }

  if (allowedOrigins.includes(origin)) {
    return true;
  }

  if (!isProduction) {
    try {
      const parsed = new URL(origin);
      const isLocalHost =
        parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1";
      if (isLocalHost) {
        return true;
      }
    } catch {
      return false;
    }
  }

  return false;
};

export {
  allowedOrigins,
  isAllowedOrigin,
  clearCookieOptions,
  csrfCookieOptions,
  cookieName,
  tokenCookieOptions,
};
