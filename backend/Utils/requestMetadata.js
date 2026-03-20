const buildRequestMetadata = (req, extra = {}) => {
  return {
    ip: req.ip,
    userAgent: req.get("user-agent") || "unknown",
    ...extra,
  };
};

export default buildRequestMetadata;
