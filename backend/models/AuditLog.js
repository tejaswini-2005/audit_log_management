import mongoose from "mongoose";

const auditSchema = new mongoose.Schema(
  {
    sequence: {
      type: Number,
      required: true,
      unique: true,
      immutable: true,
      index: true,
    },

    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      immutable: true,
      index: true,
    },

    action: {
      type: String,
      required: true,
      immutable: true,
      index: true,
    },

    metadata: {
      type: Object,
      default: {},
      immutable: true,
    },

    previousHash: {
      type: String,
      required: true,
      immutable: true,
    },

    currentHash: {
      type: String,
      required: true,
      immutable: true,
    },

    timestamp: {
      type: Date,
      default: Date.now,
      immutable: true,
      index: true,
    },
  },
  { strict: true }
);

auditSchema.index({ userId: 1, timestamp: -1 });
auditSchema.index({ action: 1, timestamp: -1 });

auditSchema.pre("save", function () {
  if (!this.isNew) {
    throw new Error("Audit logs cannot be modified");
  }
});

// Block update operations
auditSchema.pre("updateOne", function () {
  throw new Error("Audit logs are immutable and cannot be updated");
});

auditSchema.pre("updateMany", function () {
  throw new Error("Audit logs are immutable and cannot be updated");
});

auditSchema.pre("findOneAndUpdate", function () {
  throw new Error("Audit logs are immutable and cannot be updated");
});

auditSchema.pre("replaceOne", function () {
  throw new Error("Audit logs are immutable and cannot be replaced");
});

auditSchema.pre("findOneAndReplace", function () {
  throw new Error("Audit logs are immutable and cannot be replaced");
});

// Block delete operations
auditSchema.pre("deleteOne", function () {
  throw new Error("Audit logs are immutable and cannot be deleted");
});

auditSchema.pre("deleteMany", function () {
  throw new Error("Audit logs are immutable and cannot be deleted");
});

auditSchema.pre("findOneAndDelete", function () {
  throw new Error("Audit logs are immutable and cannot be deleted");
});

export default mongoose.model("AuditLog", auditSchema);
