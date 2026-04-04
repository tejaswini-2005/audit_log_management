import mongoose from "mongoose";

const submissionSchema = new mongoose.Schema(
  {
    projectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
      required: true,
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    content: {
      type: String,
      required: true,
      trim: true,
      maxlength: 40000,
    },
    fileUrl: {
      type: String,
      default: "",
      trim: true,
      maxlength: 2000,
    },
    fileUrlPDF: {
      type: String,
      default: "",
      trim: true,
      maxlength: 2000,
    },
    fileUrlWord: {
      type: String,
      default: "",
      trim: true,
      maxlength: 2000,
    },
    status: {
      type: String,
      enum: ["DRAFT", "SUBMITTED", "APPROVED", "REJECTED"],
      default: "DRAFT",
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

submissionSchema.index({ projectId: 1, userId: 1 }, { unique: true });
submissionSchema.index({ createdAt: -1 });

const Submission = mongoose.model("Submission", submissionSchema);

export default Submission;