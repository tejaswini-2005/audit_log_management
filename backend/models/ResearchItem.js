import mongoose from "mongoose";

const researchItemSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 160,
    },
    description: {
      type: String,
      required: true,
      trim: true,
      maxlength: 4000,
    },
    tags: {
      type: [String],
      default: [],
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ["DRAFT", "SELECTED", "DISCARDED"],
      default: "DRAFT",
      index: true,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

researchItemSchema.index({ createdAt: -1 });
researchItemSchema.index({ title: "text", description: "text", tags: "text" });

const ResearchItem = mongoose.model("ResearchItem", researchItemSchema);

export default ResearchItem;
