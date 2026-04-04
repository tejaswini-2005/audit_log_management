import express from "express";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import cors from "cors";
import { setLogging } from "tesseract.js";

import logRoutes from "./routes/logRoutes.js";
import connectDB from "./config/db.js";
import authRoutes from "./routes/authRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
import researchRoutes from "./routes/researchRoutes.js";
import projectRoutes from "./routes/projectRoutes.js";
import submissionRoutes from "./routes/submissionRoutes.js";
import aiRoutes from "./routes/aiRoutes.js";
import ocrRoutes from "./routes/ocrRoutes.js";
import documentRoutes from "./routes/documentRoutes.js";
import { isAllowedOrigin } from "./config/security.js";
import { csrfProtection, isCsrfError } from "./middleware/csrfMiddleware.js";
import path from "path";
import { fileURLToPath } from "url";

dotenv.config();

// Configure tesseract.js for debugging
setLogging(true);

const port = process.env.PORT || 8080;
const app = express();

// Get __dirname equivalent in ES modules
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DOCUMENTS_DIR = path.join(__dirname, "documents");

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

app.use(csrfProtection);

// Serve generated documents as static files (before CSRF for public downloads)
app.use("/documents", express.static(DOCUMENTS_DIR));

app.get("/", (req, res) => {
  res.status(200).json({ msg: `Server is running on port ${port}` });
});

app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/admin", adminRoutes);
app.use("/api/v1/logs", logRoutes);
app.use("/api/v1/research", researchRoutes);
app.use("/api/v1/projects", projectRoutes);
app.use("/api/v1/submissions", submissionRoutes);
app.use("/api/v1/documents", documentRoutes);
app.use("/api/v1/ai", aiRoutes);
app.use("/api/v1/ocr", ocrRoutes);

app.use((req, res) => {
  res.status(404).json({ msg: "Route not found" });
});

app.use((err, req, res, next) => {
  if (err?.message?.startsWith("CORS:")) {
    return res.status(403).json({ msg: err.message });
  }

  if (isCsrfError(err)) {
    return res.status(403).json({ msg: "Invalid or missing CSRF token" });
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