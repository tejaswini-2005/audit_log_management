import PDFDocument from "pdfkit";
import { Document, Packer, Paragraph, TextRun } from "docx";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DOCUMENTS_DIR = path.join(__dirname, "..", "documents");
const TAMIL_REGEX = /[\u0B80-\u0BFF]/;

const hasTamilText = (text) => TAMIL_REGEX.test(String(text || ""));

const resolveTamilFontPath = () => {
  const configuredPath = process.env.TAMIL_FONT_PATH;
  const candidatePaths = [
    configuredPath,
    path.join(__dirname, "..", "fonts", "Latha.ttf"),
    path.join(__dirname, "..", "fonts", "Nirmala.ttf"),
    "C:/Windows/Fonts/latha.ttf",
    "C:/Windows/Fonts/Nirmala.ttf",
    "/usr/share/fonts/truetype/noto/NotoSansTamil-Regular.ttf",
    "/usr/share/fonts/truetype/noto/NotoSerifTamil-Regular.ttf",
    "/Library/Fonts/Latha.ttf",
  ].filter(Boolean);

  for (const candidate of candidatePaths) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }

  return null;
};

// Ensure documents directory exists
if (!fs.existsSync(DOCUMENTS_DIR)) {
  fs.mkdirSync(DOCUMENTS_DIR, { recursive: true });
}

/**
 * Generate PDF from content with full Tamil Unicode support
 * @param {string} content - The source text content used to generate PDF
 * @param {string} documentName - Optional name for the document (used in filename)
 * @returns {Promise<{fileName: string, filePath: string}>}
 */
export const generatePDF = async (content, documentName = "document") => {
  return new Promise((resolve, reject) => {
    try {
      const safeContent = String(content || "").trim();

      if (!safeContent) {
        return reject(new Error("Content cannot be empty for PDF generation"));
      }

      const includesTamil = hasTamilText(safeContent);
      const tamilFontPath = includesTamil ? resolveTamilFontPath() : null;

      if (includesTamil && !tamilFontPath) {
        return reject(
          new Error(
            "Tamil font not found. Set TAMIL_FONT_PATH or install a Tamil Unicode font (for example Latha/Nirmala/Noto Sans Tamil)."
          )
        );
      }

      const timestamp = Date.now();
      const fileName = `${documentName}_${timestamp}.pdf`;
      const filePath = path.join(DOCUMENTS_DIR, fileName);

      // Create PDF document with UTF-8 encoding
      const doc = new PDFDocument({
        encoding: "UTF-8",
        margin: 50,
        size: "A4",
      });

      // Create write stream
      const writeStream = fs.createWriteStream(filePath);

      doc.pipe(writeStream);

      if (tamilFontPath) {
        doc.registerFont("TamilUnicode", tamilFontPath);
      }

      // Set up fonts with Unicode support
      // Using standard font which supports UTF-8/Unicode
      doc.fontSize(12).font("Helvetica");

      // Add title area with border
      doc.rect(50, 50, 495, 30).stroke("black");
      doc
        .fontSize(14)
        .font("Helvetica-Bold")
        .text("Document", 55, 60, {
          width: 485,
          align: "center",
        });

      // Add generation timestamp
      doc
        .fontSize(10)
        .font("Helvetica")
        .text(`Generated: ${new Date().toISOString()}`, {
          align: "right",
          margin: [20, 50, 50, 50],
        });

      // Add content with proper line wrapping
      doc
        .fontSize(11)
        .font(tamilFontPath ? "TamilUnicode" : "Helvetica")
        .text(safeContent, {
          width: 495,
          align: "left",
          lineGap: 5,
        });

      // Add footer with page numbers
      const pages = doc.bufferedPageRange();
      for (let i = 0; i < pages.count; i++) {
        doc.switchToPage(i);
        doc
          .fontSize(8)
          .font("Helvetica")
          .text(
            `Page ${i + 1} of ${pages.count}`,
            50,
            doc.page.height - 30,
            {
              align: "center",
            }
          );
      }

      doc.end();

      writeStream.on("finish", () => {
        resolve({
          fileName,
          filePath,
        });
      });

      writeStream.on("error", (err) => {
        reject(new Error(`Failed to create PDF: ${err.message}`));
      });
    } catch (err) {
      reject(new Error(`PDF generation error: ${err.message}`));
    }
  });
};

/**
 * Generate Word (.docx) from content with full Tamil Unicode support
 * @param {string} content - The source text content used to generate Word
 * @param {string} documentName - Optional name for the document
 * @returns {Promise<{fileName: string, filePath: string}>}
 */
export const generateWord = async (content, documentName = "document") => {
  try {
    const safeContent = String(content || "").trim();

    if (!safeContent) {
      throw new Error("Content cannot be empty for Word generation");
    }

    const includesTamil = hasTamilText(safeContent);
    const preferredTamilFont = process.env.TAMIL_WORD_FONT || "Latha";

    const timestamp = Date.now();
    const fileName = `${documentName}_${timestamp}.docx`;
    const filePath = path.join(DOCUMENTS_DIR, fileName);

    // Split content into paragraphs for better formatting
    const paragraphs = safeContent.split("\n").filter((line) => line.trim() !== "");

    // Create document with paragraphs
    const doc = new Document({
      sections: [
        {
          children: [
            // Title
            new Paragraph({
              text: "Document",
              heading: "Heading1",
              themeColor: "accent1",
              bold: true,
              fontSize: 24,
            }),

            // Generation timestamp
            new Paragraph({
              text: `Generated: ${new Date().toISOString()}`,
              italics: true,
              fontSize: 10,
            }),

            // Empty paragraph for spacing
            new Paragraph({
              text: "",
            }),

            // Content paragraphs with proper UTF-8 encoding
            ...paragraphs.map(
              (paragraph) =>
                new Paragraph({
                  children: [
                    new TextRun({
                      text: paragraph,
                      size: 22, // 11pt font
                      font: includesTamil ? preferredTamilFont : "Calibri",
                    }),
                  ],
                  spacing: {
                    line: 360, // 1.5 line spacing
                    lineRule: "auto",
                  },
                })
            ),

            // Footer with creation info
            new Paragraph({
              text: "",
            }),
            new Paragraph({
              text: `Document created with UTF-8 encoding for full language support`,
              italics: true,
              fontSize: 9,
              color: "666666",
            }),
          ],
        },
      ],
    });

    // Generate and save the file
    const buffer = await Packer.toBuffer(doc);
    fs.writeFileSync(filePath, buffer);

    return {
      fileName,
      filePath,
    };
  } catch (err) {
    throw new Error(`Word document generation error: ${err.message}`);
  }
};

/**
 * Generate both PDF and Word from the same content
 * @param {string} content - The text content
 * @param {string} documentName - Optional name for documents
 * @returns {Promise<{pdf: {fileName, filePath}, word: {fileName, filePath}}>}
 */
export const generateBothDocuments = async (content, documentName = "document") => {
  try {
    const [pdfResult, wordResult] = await Promise.all([
      generatePDF(content, documentName),
      generateWord(content, documentName),
    ]);

    return {
      pdf: pdfResult,
      word: wordResult,
    };
  } catch (err) {
    throw new Error(`Document generation error: ${err.message}`);
  }
};

/**
 * Get document file URLs (relative paths for serving)
 * @param {object} pdfResult - PDF generation result
 * @param {object} wordResult - Word generation result
 * @returns {object} URLs for both documents
 */
export const getDocumentUrls = (pdfResult, wordResult) => {
  return {
    pdfUrl: `/documents/${pdfResult.fileName}`,
    wordUrl: `/documents/${wordResult.fileName}`,
  };
};

/**
 * Delete document files
 * @param {string} fileName - The name of the file to delete
 * @returns {Promise<void>}
 */
export const deleteDocument = async (fileName) => {
  try {
    const filePath = path.join(DOCUMENTS_DIR, fileName);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  } catch (err) {
    console.error(`Failed to delete document: ${err.message}`);
  }
};

export default {
  generatePDF,
  generateWord,
  generateBothDocuments,
  getDocumentUrls,
  deleteDocument,
  DOCUMENTS_DIR,
};
