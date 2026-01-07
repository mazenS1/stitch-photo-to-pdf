import { useState, useRef } from "react";
import { jsPDF } from "jspdf";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { UploadSimple, FilePdf, Trash, X } from "@phosphor-icons/react";

export function PhotoToPdf() {
  const [images, setImages] = useState<Array<{ url: string; file: File }>>([]);
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

  const generatePdf = async () => {
    if (images.length === 0) return;

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

    pdf.save("photos.pdf");
  };

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold text-foreground">Photo to PDF</h1>
          <p className="text-muted-foreground">
            Upload photos and convert them into a single PDF file
          </p>
        </div>

        <Card className="p-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex gap-2">
                <Button
                  onClick={() => fileInputRef.current?.click()}
                  className="gap-2"
                >
                  <UploadSimple weight="bold" />
                  Add Photos
                </Button>
                {images.length > 0 && (
                  <Button
                    onClick={generatePdf}
                    variant="default"
                    className="gap-2"
                  >
                    <FilePdf weight="bold" />
                    Generate PDF
                  </Button>
                )}
              </div>
              {images.length > 0 && (
                <Button onClick={clearAll} variant="outline" className="gap-2">
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
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">
                    {images.length} {images.length === 1 ? "photo" : "photos"}
                  </Badge>
                  <span className="text-sm text-muted-foreground">
                    Each photo will be a separate page in the PDF
                  </span>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {images.map((image, index) => (
                    <div key={index} className="relative group">
                      <div className="aspect-square rounded-lg overflow-hidden border-2 border-border">
                        <img
                          src={image.url}
                          alt={`Preview ${index + 1}`}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <button
                        onClick={() => removeImage(index)}
                        className="absolute top-2 right-2 bg-destructive text-destructive-foreground rounded-full p-1.5 opacity-0 group-hover:opacity-100 transition-opacity"
                        aria-label="Remove image"
                      >
                        <X weight="bold" size={16} />
                      </button>
                      <div className="absolute bottom-2 left-2 bg-background/80 backdrop-blur-sm rounded px-2 py-1 text-xs font-medium">
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
                className="border-2 border-dashed border-border rounded-lg p-12 text-center cursor-pointer hover:border-primary transition-colors"
              >
                <UploadSimple
                  size={48}
                  className="mx-auto mb-4 text-muted-foreground"
                />
                <p className="text-lg font-medium text-foreground mb-1">
                  Click to upload photos
                </p>
                <p className="text-sm text-muted-foreground">
                  or drag and drop images here
                </p>
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
