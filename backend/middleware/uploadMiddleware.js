import multer from "multer";

const storage = multer.memoryStorage();

const fileFilter = (req, file, callback) => {
  const isImage = String(file.mimetype || "").startsWith("image/");
  const isPdf = file.mimetype === "application/pdf";

  if (isImage || isPdf) {
    return callback(null, true);
  }

  return callback(new Error("Only image or PDF files are allowed"));
};

export const uploadSingleFile = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 15 * 1024 * 1024,
  },
}).single("file");