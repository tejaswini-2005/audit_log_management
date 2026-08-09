import mongoose from "mongoose";

const auditCounterSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      unique: true,
      required: true,
      immutable: true,
    },
    value: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  { versionKey: false }
);

export default mongoose.model("AuditCounter", auditCounterSchema);
