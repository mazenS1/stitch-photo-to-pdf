import { useState, useRef } from "react";
import { jsPDF } from "jspdf";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  UploadSimple,
  FilePdf,
  Trash,
  X,
  Eye,
  DownloadSimple,
  ArrowUp,
  ArrowDown,
} from "@phosphor-icons/react";

export function PhotoToPdf() {
  const [images, setImages] = useState<Array<{ url: string; file: File }>>([]);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const newImages = Array.from(files).map((file) => ({
      url: URL.createObjectURL(file),
      file,
    }));

    setImages((prev) => [...prev, ...newImages]);
  };

  const removeImage = (index: number) => {
    setImages((prev) => {
      URL.revokeObjectURL(prev[index].url);
      return prev.filter((_, i) => i !== index);
    });
  };

  const clearAll = () => {
    images.forEach((img) => URL.revokeObjectURL(img.url));
    setImages([]);
  };

  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;

    const newImages = [...images];
    const draggedImage = newImages[draggedIndex];
    newImages.splice(draggedIndex, 1);
    newImages.splice(index, 0, draggedImage);

    setImages(newImages);
    setDraggedIndex(index);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  const moveImage = (index: number, direction: "up" | "down") => {
    const newIndex = direction === "up" ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= images.length) return;

    const newImages = [...images];
    [newImages[index], newImages[newIndex]] = [
      newImages[newIndex],
      newImages[index],
    ];
    setImages(newImages);
  };

  const createPdf = async () => {
    if (images.length === 0) return null;

    const pdf = new jsPDF();
    let isFirstPage = true;

    for (const { url } of images) {
      const img = new Image();
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
        img.src = url;
      });

      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();

      const imgAspectRatio = img.width / img.height;
      const pageAspectRatio = pageWidth / pageHeight;

      let renderWidth, renderHeight;
      if (imgAspectRatio > pageAspectRatio) {
        renderWidth = pageWidth;
        renderHeight = pageWidth / imgAspectRatio;
      } else {
        renderHeight = pageHeight;
        renderWidth = pageHeight * imgAspectRatio;
      }

      const xOffset = (pageWidth - renderWidth) / 2;
      const yOffset = (pageHeight - renderHeight) / 2;

      if (!isFirstPage) {
        pdf.addPage();
      }
      isFirstPage = false;

      pdf.addImage(img, "JPEG", xOffset, yOffset, renderWidth, renderHeight);
    }

    return pdf;
  };

  const previewPdf = async () => {
    setIsGenerating(true);
    try {
      const pdf = await createPdf();
      if (pdf) {
        const blob = pdf.output("blob");
        const url = URL.createObjectURL(blob);
        setPdfPreviewUrl(url);
      }
    } finally {
      setIsGenerating(false);
    }
  };

  const downloadPdf = async () => {
    const pdf = await createPdf();
    if (pdf) {
      pdf.save("photos.pdf");
    }
  };

  const closePreview = () => {
    if (pdfPreviewUrl) {
      URL.revokeObjectURL(pdfPreviewUrl);
      setPdfPreviewUrl(null);
    }
  };

  return (
    <div className="min-h-screen bg-background p-4 sm:p-8">
      <div className="max-w-4xl mx-auto space-y-4 sm:space-y-6">
        <div className="text-center space-y-1 sm:space-y-2">
          <h1 className="text-2xl sm:text-4xl font-bold text-foreground">
            Photo to PDF
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            Upload photos and convert them into a single PDF file
          </p>
        </div>

        <Card className="p-4 sm:p-6">
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:justify-between">
              <div className="flex flex-wrap gap-2">
                <Button
                  onClick={() => fileInputRef.current?.click()}
                  className="gap-2 flex-1 sm:flex-none"
                  size="default"
                >
                  <UploadSimple weight="bold" />
                  <span className="sm:inline">Add Photos</span>
                </Button>
                {images.length > 0 && (
                  <>
                    <Button
                      onClick={previewPdf}
                      variant="outline"
                      className="gap-2 flex-1 sm:flex-none"
                      disabled={isGenerating}
                    >
                      <Eye weight="bold" />
                      <span className="hidden sm:inline">
                        {isGenerating ? "Generating..." : "Preview"}
                      </span>
                      <span className="sm:hidden">
                        {isGenerating ? "..." : "Preview"}
                      </span>
                    </Button>
                    <Button
                      onClick={downloadPdf}
                      variant="default"
                      className="gap-2 flex-1 sm:flex-none"
                    >
                      <FilePdf weight="bold" />
                      <span className="hidden sm:inline">Download PDF</span>
                      <span className="sm:hidden">Download</span>
                    </Button>
                  </>
                )}
              </div>
              {images.length > 0 && (
                <Button
                  onClick={clearAll}
                  variant="outline"
                  className="gap-2 w-full sm:w-auto"
                >
                  <Trash weight="bold" />
                  Clear All
                </Button>
              )}
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={handleFileSelect}
              className="hidden"
            />

            {images.length > 0 && (
              <div className="space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                  <Badge variant="secondary">
                    {images.length} {images.length === 1 ? "photo" : "photos"}
                  </Badge>
                  <span className="text-xs sm:text-sm text-muted-foreground">
                    <span className="hidden sm:inline">
                      Drag photos to reorder •{" "}
                    </span>
                    <span className="sm:hidden">Tap arrows to reorder • </span>
                    Each photo = 1 page
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
                  {images.map((image, index) => (
                    <div
                      key={index}
                      draggable
                      onDragStart={() => handleDragStart(index)}
                      onDragOver={(e) => handleDragOver(e, index)}
                      onDragEnd={handleDragEnd}
                      className={`relative group sm:cursor-move ${
                        draggedIndex === index ? "opacity-50" : ""
                      }`}
                    >
                      <div className="aspect-square rounded-lg overflow-hidden border-2 border-border">
                        <img
                          src={image.url}
                          alt={`Preview ${index + 1}`}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      {/* Desktop: hover to show delete */}
                      <button
                        onClick={() => removeImage(index)}
                        className="absolute top-1.5 right-1.5 sm:top-2 sm:right-2 bg-destructive text-destructive-foreground rounded-full p-1 sm:p-1.5 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity"
                        aria-label="Remove image"
                      >
                        <X weight="bold" size={14} />
                      </button>
                      {/* Mobile: reorder buttons */}
                      <div className="absolute top-1.5 left-1.5 flex flex-col gap-1 sm:hidden">
                        {index > 0 && (
                          <button
                            onClick={() => moveImage(index, "up")}
                            className="bg-background/90 backdrop-blur-sm text-foreground rounded p-1 border border-border"
                            aria-label="Move up"
                          >
                            <ArrowUp weight="bold" size={14} />
                          </button>
                        )}
                        {index < images.length - 1 && (
                          <button
                            onClick={() => moveImage(index, "down")}
                            className="bg-background/90 backdrop-blur-sm text-foreground rounded p-1 border border-border"
                            aria-label="Move down"
                          >
                            <ArrowDown weight="bold" size={14} />
                          </button>
                        )}
                      </div>
                      <div className="absolute bottom-1.5 left-1.5 sm:bottom-2 sm:left-2 bg-background/80 backdrop-blur-sm rounded px-1.5 py-0.5 sm:px-2 sm:py-1 text-[10px] sm:text-xs font-medium">
                        Page {index + 1}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {images.length === 0 && (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-border rounded-lg p-8 sm:p-12 text-center cursor-pointer hover:border-primary active:border-primary transition-colors"
              >
                <UploadSimple
                  size={40}
                  className="mx-auto mb-3 sm:mb-4 text-muted-foreground"
                />
                <p className="text-base sm:text-lg font-medium text-foreground mb-1">
                  Tap to upload photos
                </p>
                <p className="text-xs sm:text-sm text-muted-foreground">
                  or drag and drop images here
                </p>
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* PDF Preview Modal */}
      {pdfPreviewUrl && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-2 sm:p-4">
          <div className="bg-background rounded-lg w-full max-w-5xl h-[95vh] sm:h-[90vh] flex flex-col">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 sm:p-4 border-b border-border">
              <h2 className="text-base sm:text-lg font-semibold">
                PDF Preview
              </h2>
              <div className="flex gap-2">
                <Button
                  onClick={downloadPdf}
                  className="gap-2 flex-1 sm:flex-none"
                  size="default"
                >
                  <DownloadSimple weight="bold" />
                  Download
                </Button>
                <Button
                  onClick={closePreview}
                  variant="outline"
                  className="gap-2 flex-1 sm:flex-none"
                  size="default"
                >
                  <X weight="bold" />
                  Close
                </Button>
              </div>
            </div>
            <div className="flex-1 p-2 sm:p-4 min-h-0">
              <iframe
                src={pdfPreviewUrl}
                className="w-full h-full rounded border border-border"
                title="PDF Preview"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
