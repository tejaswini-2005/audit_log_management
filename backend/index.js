import express from "express";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import cors from "cors";

import logRoutes from "./routes/logRoutes.js";
import connectDB from "./config/db.js";
import authRoutes from "./routes/authRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
import { isAllowedOrigin } from "./config/security.js";

dotenv.config();
const port = process.env.PORT || 8080;
const app = express();

app.use(express.json({ limit: "1mb" }));
app.use(cookieParser());

app.use(
  cors({
    origin: (origin, callback) => {
      if (isAllowedOrigin(origin)) {
        return callback(null, true);
      }

      return callback(new Error(`CORS: origin ${origin} not allowed`));
    },
    credentials: true,
  })
);

app.get("/", (req, res) => {
  res.status(200).json({ msg: `Server is running on port ${port}` });
});

app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/admin", adminRoutes);
app.use("/api/v1/logs", logRoutes);

app.use((req, res) => {
  res.status(404).json({ msg: "Route not found" });
});

app.use((err, req, res, next) => {
  if (err?.message?.startsWith("CORS:")) {
    return res.status(403).json({ msg: err.message });
  }

  const statusCode = Number.isInteger(err?.statusCode) ? err.statusCode : 500;
  const msg =
    statusCode >= 500
      ? "Internal server error"
      : err?.message || "Request failed";

  if (statusCode >= 500) {
    console.error("Unhandled error:", err);
  }

  return res.status(statusCode).json({ msg });
});

app.listen(port, () => {
  connectDB();
  console.log("your server is running in port", port);
});