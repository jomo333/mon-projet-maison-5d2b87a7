import { useState } from "react";
import * as pdfjsLib from "pdfjs-dist";

// Set the worker source
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

interface ConversionResult {
  images: Blob[];
  pageCount: number;
}

export function usePdfToImage() {
  const [isConverting, setIsConverting] = useState(false);
  const [progress, setProgress] = useState(0);

  const convertPdfToImages = async (
    file: File,
    options: { scale?: number; maxPages?: number } = {}
  ): Promise<ConversionResult> => {
    const { scale = 2, maxPages = 10 } = options;
    
    setIsConverting(true);
    setProgress(0);
    
    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      const pageCount = Math.min(pdf.numPages, maxPages);
      const images: Blob[] = [];

      for (let i = 1; i <= pageCount; i++) {
        const page = await pdf.getPage(i);
        const viewport = page.getViewport({ scale });

        const canvas = document.createElement("canvas");
        const context = canvas.getContext("2d");
        
        if (!context) {
          throw new Error("Could not get canvas context");
        }

        canvas.width = viewport.width;
        canvas.height = viewport.height;

        await page.render({
          canvasContext: context,
          viewport: viewport,
        }).promise;

        const blob = await new Promise<Blob>((resolve, reject) => {
          canvas.toBlob(
            (b) => {
              if (b) resolve(b);
              else reject(new Error("Failed to convert canvas to blob"));
            },
            "image/png",
            0.95
          );
        });

        images.push(blob);
        setProgress(Math.round((i / pageCount) * 100));
      }

      return { images, pageCount: pdf.numPages };
    } finally {
      setIsConverting(false);
      setProgress(0);
    }
  };

  const isPdf = (file: File): boolean => {
    return file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
  };

  return {
    convertPdfToImages,
    isPdf,
    isConverting,
    progress,
  };
}
