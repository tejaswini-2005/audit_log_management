const formatIssuePath = (path) => {
  if (!Array.isArray(path) || path.length === 0) {
    return "request";
  }

  return path
    .map((segment) => (typeof segment === "number" ? `[${segment}]` : segment))
    .join(".");
};

export const validate = (schema) => (req, res, next) => {
  const result = schema.safeParse({
    body: req.body ?? {},
    query: req.query ?? {},
    params: req.params ?? {},
  });

  if (!result.success) {
    return res.status(400).json({
      msg: "Validation failed",
      errors: result.error.issues.map((issue) => ({
        path: formatIssuePath(issue.path),
        message: issue.message,
      })),
    });
  }

  req.validated = result.data;
  res.locals.validated = result.data;

  req.body = result.data.body;
  req.params = result.data.params;

  return next();
};
