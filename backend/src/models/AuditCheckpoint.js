import mongoose from "mongoose";

const auditCheckpointSchema = new mongoose.Schema(
  {
    sequence: {
      type: Number,
      required: true,
      unique: true,
      index: true,
      min: 1,
      immutable: true,
    },
    hash: {
      type: String,
      required: true,
      immutable: true,
    },
    createdAt: {
      type: Date,
      default: Date.now,
      immutable: true,
      index: true,
    },
  },
  { versionKey: false }
);

auditCheckpointSchema.index({ sequence: -1 });

auditCheckpointSchema.pre("save", function () {
  if (!this.isNew) {
    throw new Error("Audit checkpoints cannot be modified");
  }
});

export default mongoose.model("AuditCheckpoint", auditCheckpointSchema);
