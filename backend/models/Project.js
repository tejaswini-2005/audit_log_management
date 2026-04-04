import mongoose from "mongoose";

const projectSchema = new mongoose.Schema(
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
    requirements: {
      type: String,
      default: "",
      trim: true,
      maxlength: 6000,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },
    status: {
      type: String,
      enum: [
        "CREATED",
        "ASSIGNED",
        "IN_PROGRESS",
        "SUBMITTED",
        "APPROVED",
        "COMPLETED",
        "REJECTED",
      ],
      default: "CREATED",
      index: true,
    },
    sourceResearchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ResearchItem",
      default: null,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

projectSchema.index({ createdAt: -1 });
projectSchema.index({ title: "text", description: "text", requirements: "text" });

const Project = mongoose.model("Project", projectSchema);

export default Project;
