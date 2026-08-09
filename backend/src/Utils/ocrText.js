import { createCanvas } from "@napi-rs/canvas";
import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf.mjs";
import { createWorker } from "tesseract.js";

const SUPPORTED_IMAGE_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/bmp",
  "image/tiff",
  "image/gif",
]);

const PDF_MIME_TYPE = "application/pdf";

const cleanText = (value) => String(value || "").replace(/\u0000/g, "").trim();

const createOcrWorker = async () => {
  try {
    return createWorker("eng+tam");
  } catch (err) {
    console.error("Failed to create OCR worker:", err);
    const error = new Error("OCR service is unavailable. Please try again later.");
    error.statusCode = 503;
    throw error;
  }
};

const extractTextWithWorker = async (buffer) => {
  let worker;
  try {
    worker = await createOcrWorker();
    
    // Buffer is already Uint8Array from entry point
    const result = await worker.recognize(buffer);
    return cleanText(result?.data?.text || "");
  } catch (err) {
    console.error("Text extraction error:", err.message);
    if (err.statusCode) throw err;
    const error = new Error("Failed to extract text from image");
    error.statusCode = 500;
    throw error;
  } finally {
    if (worker) {
      try {
        await worker.terminate();
      } catch (termErr) {
        console.error("Error terminating worker:", termErr);
      }
    }
  }
};

const renderPdfPageToBuffer = async (page, scale = 2) => {
  try {
    const viewport = page.getViewport({ scale });
    const canvas = createCanvas(Math.ceil(viewport.width), Math.ceil(viewport.height));
    const context = canvas.getContext("2d");

    await page.render({ canvasContext: context, viewport }).promise;

    // Convert canvas buffer to proper Uint8Array
    const buffer = canvas.toBuffer("image/png");
    return new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.length);
  } catch (err) {
    console.error(`Failed to render PDF page to buffer (scale=${scale}):`, err.message);
    
    // Retry with lower scale if rendering fails
    if (scale > 1) {
      console.log("Retrying with lower scale...");
      return renderPdfPageToBuffer(page, scale - 1);
    }
    
    throw new Error("Failed to render PDF page. PDF may be corrupted or unsupported.");
  }
};

const extractPdfPages = async (buffer) => {
  let pdfDocument;
  try {
    console.log("Parsing PDF document...");
    
    pdfDocument = await pdfjsLib.getDocument({
      data: buffer,  // Expected to be Uint8Array from entry point
      useWorkerFetch: false,
      isEvalSupported: false,
      disableFontFace: true,
    }).promise;

    console.log(`PDF loaded with ${pdfDocument.numPages} pages`);
    const pages = [];

    for (let pageNumber = 1; pageNumber <= pdfDocument.numPages; pageNumber += 1) {
      try {
        console.log(`Processing page ${pageNumber}...`);
        const page = await pdfDocument.getPage(pageNumber);
        const textContent = await page.getTextContent();
        const typedText = cleanText(
          textContent.items.map((item) => item.str || "").join(" ")
        );

        // Check if this is a typed/digital PDF (not a scanned image)
        if (typedText.length > 50) {
          console.warn(`Page ${pageNumber} appears to be a typed PDF. Attempting OCR anyway.`);
        }

        console.log(`Rendering page ${pageNumber} to image...`);
        const pageBuffer = await renderPdfPageToBuffer(page);
        console.log(`Extracting text from page ${pageNumber} using OCR...`);
        const pageText = await extractTextWithWorker(pageBuffer);
        pages.push(pageText);

        page.cleanup();
      } catch (pageErr) {
        console.error(`Error processing page ${pageNumber}:`, pageErr.message);
        // If one page fails, try to continue with next pages
        if (pageNumber === 1 && pdfDocument.numPages === 1) {
          // If it's the only page, propagate the error
          throw pageErr;
        }
        // For multi-page PDFs, add empty content and continue
        pages.push("");
      }
    }

    if (pages.every((p) => !p.trim())) {
      throw new Error("No text could be extracted from the PDF. The file may be corrupted or contain only images.");
    }

    return pages;
  } catch (err) {
    console.error("PDF extraction error:", err.message);
    if (err.statusCode) throw err;
    throw new Error(err.message || "Failed to process PDF file");
  } finally {
    if (pdfDocument) {
      try {
        pdfDocument.destroy();
      } catch (cleanupErr) {
        console.error("Error cleaning up PDF document:", cleanupErr);
      }
    }
  }
};

export const extractOcrText = async ({ buffer, mimeType }) => {
  try {
    const resolvedMimeType = String(mimeType || "").toLowerCase();

    console.log(`OCR extraction started for mimetype: ${resolvedMimeType}`);

    // Convert Buffer to proper Uint8Array for pdf.js and tesseract.js
    let uint8Buffer;
    if (Buffer.isBuffer(buffer)) {
      // Convert Node.js Buffer to Uint8Array using ArrayBuffer
      uint8Buffer = new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.length);
    } else if (buffer instanceof Uint8Array) {
      uint8Buffer = buffer;
    } else if (buffer instanceof ArrayBuffer) {
      uint8Buffer = new Uint8Array(buffer);
    } else {
      // Fallback: Try to create from unknown type
      uint8Buffer = new Uint8Array(Buffer.from(buffer));
    }

    console.log(`Buffer type: ${uint8Buffer.constructor.name}, size: ${uint8Buffer.length} bytes`);

    if (SUPPORTED_IMAGE_MIME_TYPES.has(resolvedMimeType)) {
      console.log("Processing image file...");
      const text = await extractTextWithWorker(uint8Buffer);
      return {
        extractedText: text,
        pages: [text],
      };
    }

    if (resolvedMimeType === PDF_MIME_TYPE) {
      console.log("Processing PDF file...");
      const pages = await extractPdfPages(uint8Buffer);
      return {
        extractedText: pages.join("\n\n").trim(),
        pages,
      };
    }

    const error = new Error("Only image or scanned PDF files are supported");
    error.statusCode = 400;
    throw error;
  } catch (err) {
    if (err.statusCode) throw err;
    console.error("OCR processing error:", err.message);
    const error = new Error(err.message || "OCR processing failed");
    error.statusCode = 500;
    throw error;
  }
};