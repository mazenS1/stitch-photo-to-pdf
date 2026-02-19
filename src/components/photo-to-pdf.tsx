import { useRef, useState } from "react";
import { jsPDF } from "jspdf";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Field, FieldLabel } from "@/components/ui/field";
import { Textarea } from "@/components/ui/textarea";
import { LanguageToggle } from "@/components/language-toggle";
import { useLanguage } from "@/lib/i18n";
import {
  UploadSimple,
  FilePdf,
  Trash,
  X,
  Eye,
  DownloadSimple,
  ArrowUp,
  ArrowDown,
  NotePencil,
  CircleNotch,
} from "@phosphor-icons/react";

type ImagePage = {
  id: string;
  type: "image";
  url: string;
  file: File;
};

type BlankPage = {
  id: string;
  type: "blank";
  text: string;
};

type PdfPage = ImagePage | BlankPage;

const createPageId = () => {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
};

const revokePageResources = (page: PdfPage) => {
  if (page.type === "image") {
    URL.revokeObjectURL(page.url);
  }
};

const ARABIC_CHARACTER_REGEX = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]/;

const hasArabicCharacters = (value: string) => ARABIC_CHARACTER_REGEX.test(value);

const wrapCanvasText = (
  context: CanvasRenderingContext2D,
  text: string,
  maxWidth: number
) => {
  const lines: string[] = [];
  const paragraphs = text.replace(/\r\n/g, "\n").split("\n");

  for (const paragraph of paragraphs) {
    const words = paragraph.split(/\s+/).filter((word) => word.length > 0);

    if (words.length === 0) {
      lines.push("");
      continue;
    }

    let currentLine = words[0];
    for (const word of words.slice(1)) {
      const candidateLine = `${currentLine} ${word}`;
      if (context.measureText(candidateLine).width <= maxWidth) {
        currentLine = candidateLine;
      } else {
        lines.push(currentLine);
        currentLine = word;
      }
    }

    lines.push(currentLine);
  }

  return lines;
};

const renderBlankTextAsCanvas = (text: string, pageWidth: number, pageHeight: number) => {
  const scale = 8;
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.floor(pageWidth * scale));
  canvas.height = Math.max(1, Math.floor(pageHeight * scale));

  const context = canvas.getContext("2d");
  if (!context) {
    return null;
  }

  context.fillStyle = "#FFFFFF";
  context.fillRect(0, 0, canvas.width, canvas.height);

  const fontSize = Math.max(14, Math.round(canvas.width * 0.022));
  const lineHeight = Math.round(fontSize * 1.6);
  const margin = Math.max(24, Math.round(canvas.width * 0.075));
  const isRtlText = hasArabicCharacters(text);

  context.font = `${fontSize}px "Noto Sans Arabic Variable", "Noto Sans Variable", sans-serif`;
  context.fillStyle = "#111111";
  context.textAlign = isRtlText ? "right" : "left";
  context.textBaseline = "top";
  context.direction = isRtlText ? "rtl" : "ltr";

  const maxLineWidth = canvas.width - margin * 2;
  const wrappedLines = wrapCanvasText(context, text.trim(), maxLineWidth);
  const startX = isRtlText ? canvas.width - margin : margin;
  let cursorY = margin;
  const maxY = canvas.height - margin;

  for (const line of wrappedLines) {
    if (cursorY + lineHeight > maxY) {
      break;
    }

    context.fillText(line, startX, cursorY);
    cursorY += lineHeight;
  }

  return canvas;
};

export function PhotoToPdf() {
  const { t } = useLanguage();
  const [pages, setPages] = useState<PdfPage[]>([]);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [pdfName, setPdfName] = useState("photos");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isBusy = isGenerating || isDownloading;

  const getPdfFilename = () => {
    const fallbackBaseName = "photos";
    const rawName = pdfName.trim();
    const baseName = rawName.length > 0 ? rawName : fallbackBaseName;

    const cleanedBaseName = baseName
      .replace(/[\\/:*?"<>|]/g, "_")
      .split("")
      .map((char) => (char.charCodeAt(0) <= 31 ? "_" : char))
      .join("")
      .trim()
      .replace(/[. ]+$/g, "");

    const safeBaseName =
      cleanedBaseName.length > 0 ? cleanedBaseName : fallbackBaseName;

    return safeBaseName.toLowerCase().endsWith(".pdf")
      ? safeBaseName
      : `${safeBaseName}.pdf`;
  };

  const closePreview = () => {
    if (pdfPreviewUrl) {
      URL.revokeObjectURL(pdfPreviewUrl);
      setPdfPreviewUrl(null);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const newPages: ImagePage[] = Array.from(files).map((file) => ({
      id: createPageId(),
      type: "image",
      url: URL.createObjectURL(file),
      file,
    }));

    setPages((prev) => [...prev, ...newPages]);
    e.target.value = "";
  };

  const addBlankPage = () => {
    setPages((prev) => [
      ...prev,
      {
        id: createPageId(),
        type: "blank",
        text: "",
      },
    ]);
  };

  const updateBlankPageText = (index: number, text: string) => {
    setPages((prev) =>
      prev.map((page, pageIndex) => {
        if (pageIndex !== index || page.type !== "blank") {
          return page;
        }

        return { ...page, text };
      })
    );
  };

  const removePage = (index: number) => {
    setPages((prev) => {
      const pageToRemove = prev[index];
      if (pageToRemove) {
        revokePageResources(pageToRemove);
      }

      return prev.filter((_, i) => i !== index);
    });
  };

  const clearAll = () => {
    pages.forEach(revokePageResources);
    setPages([]);
    closePreview();
  };

  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;

    const newPages = [...pages];
    const draggedPage = newPages[draggedIndex];
    newPages.splice(draggedIndex, 1);
    newPages.splice(index, 0, draggedPage);

    setPages(newPages);
    setDraggedIndex(index);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  const movePage = (index: number, direction: "up" | "down") => {
    const newIndex = direction === "up" ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= pages.length) return;

    const newPages = [...pages];
    [newPages[index], newPages[newIndex]] = [
      newPages[newIndex],
      newPages[index],
    ];
    setPages(newPages);
  };

  const createPdf = async () => {
    if (pages.length === 0) return null;

    if (typeof document !== "undefined" && "fonts" in document) {
      await document.fonts.ready;
    }

    const pdf = new jsPDF();
    let isFirstPage = true;

    const addPageIfNeeded = () => {
      if (!isFirstPage) {
        pdf.addPage();
      }
      isFirstPage = false;
    };

    for (const page of pages) {
      addPageIfNeeded();

      if (page.type === "blank") {
        const trimmedText = page.text.trim();
        if (trimmedText.length > 0) {
          const pageWidth = pdf.internal.pageSize.getWidth();
          const pageHeight = pdf.internal.pageSize.getHeight();
          const renderedTextCanvas = renderBlankTextAsCanvas(
            trimmedText,
            pageWidth,
            pageHeight
          );

          if (renderedTextCanvas) {
            pdf.addImage(renderedTextCanvas, "PNG", 0, 0, pageWidth, pageHeight);
          }
        }
        continue;
      }

      const img = new Image();
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error("Failed to load image"));
        img.src = page.url;
      });

      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const imgAspectRatio = img.width / img.height;
      const pageAspectRatio = pageWidth / pageHeight;

      let renderWidth = pageWidth;
      let renderHeight = pageHeight;
      if (imgAspectRatio > pageAspectRatio) {
        renderHeight = pageWidth / imgAspectRatio;
      } else {
        renderWidth = pageHeight * imgAspectRatio;
      }

      const xOffset = (pageWidth - renderWidth) / 2;
      const yOffset = (pageHeight - renderHeight) / 2;
      const imageFormat = page.file.type.includes("png") ? "PNG" : "JPEG";

      pdf.addImage(img, imageFormat, xOffset, yOffset, renderWidth, renderHeight);
    }

    return pdf;
  };

  const previewPdf = async () => {
    if (isBusy) return;

    setIsGenerating(true);
    try {
      const pdf = await createPdf();
      if (pdf) {
        const blob = pdf.output("blob");
        const url = URL.createObjectURL(blob);
        setPdfPreviewUrl((currentUrl) => {
          if (currentUrl) {
            URL.revokeObjectURL(currentUrl);
          }
          return url;
        });
      }
    } finally {
      setIsGenerating(false);
    }
  };

  const downloadPdf = async () => {
    if (isBusy) return;

    setIsDownloading(true);
    try {
      const pdf = await createPdf();
      if (pdf) {
        pdf.save(getPdfFilename());
      }
    } finally {
      setIsDownloading(false);
    }
  };

  const blankPages = pages.flatMap((page, index) =>
    page.type === "blank" ? [{ page, index }] : []
  );

  return (
    <div className="min-h-screen bg-background p-4 sm:p-8">
      <div className="max-w-4xl mx-auto space-y-4 sm:space-y-6">
        <div className="text-center space-y-1 sm:space-y-2 relative">
          <div className="absolute top-0 end-0">
            <LanguageToggle />
          </div>
          <h1 className="text-2xl sm:text-4xl font-bold text-foreground">
            {t.title}
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            {t.subtitle}
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
                  <span className="sm:inline">{t.addPhotos}</span>
                </Button>
                <Button
                  onClick={addBlankPage}
                  variant="outline"
                  className="gap-2 flex-1 sm:flex-none"
                >
                  <NotePencil weight="bold" />
                  <span className="sm:inline">{t.addBlankPage}</span>
                </Button>
                {pages.length > 0 && (
                  <>
                    <Button
                      onClick={previewPdf}
                      variant="outline"
                      className="gap-2 flex-1 sm:flex-none"
                      disabled={isBusy}
                    >
                      <Eye weight="bold" />
                      <span className="hidden sm:inline">
                        {isBusy ? t.generating : t.preview}
                      </span>
                      <span className="sm:hidden">
                        {isBusy ? "..." : t.preview}
                      </span>
                    </Button>
                    <Button
                      onClick={clearAll}
                      variant="outline"
                      className="gap-2 flex-1 sm:flex-none"
                    >
                      <Trash weight="bold" />
                      {t.clearAll}
                    </Button>
                  </>
                )}
              </div>
              {pages.length > 0 && (
                <Button
                  onClick={downloadPdf}
                  variant="default"
                  className="gap-2 w-full sm:w-auto"
                  disabled={isBusy}
                >
                  {isDownloading ? (
                    <CircleNotch weight="bold" className="animate-spin" />
                  ) : (
                    <FilePdf weight="bold" />
                  )}
                  <span className="hidden sm:inline">
                    {isDownloading ? t.preparingDownload : t.downloadPdf}
                  </span>
                  <span className="sm:hidden">{isDownloading ? "..." : t.download}</span>
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

            {pages.length > 0 && (
              <div className="max-w-md">
                <Field>
                  <FieldLabel htmlFor="pdf-name">{t.pdfName}</FieldLabel>
                  <Input
                    id="pdf-name"
                    value={pdfName}
                    onChange={(e) => setPdfName(e.target.value)}
                    placeholder={t.pdfNamePlaceholder}
                    autoComplete="off"
                  />
                </Field>
              </div>
            )}

            {pages.length > 0 && (
              <div className="space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                  <Badge variant="secondary">
                    {pages.length} {pages.length === 1 ? t.page : t.pages}
                  </Badge>
                  <span className="text-xs sm:text-sm text-muted-foreground">
                    <span className="hidden sm:inline">
                      {t.dragToReorder} •{" "}
                    </span>
                    <span className="sm:hidden">{t.tapToReorder} • </span>
                    {t.eachPage}
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
                  {pages.map((page, index) => (
                    <div
                      key={page.id}
                      draggable
                      onDragStart={() => handleDragStart(index)}
                      onDragOver={(e) => handleDragOver(e, index)}
                      onDragEnd={handleDragEnd}
                      className={`relative group sm:cursor-move ${
                        draggedIndex === index ? "opacity-50" : ""
                      }`}
                    >
                      <div className="aspect-square rounded-lg overflow-hidden border-2 border-border">
                        {page.type === "image" ? (
                          <img
                            src={page.url}
                            alt={`Preview ${index + 1}`}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full bg-white text-black p-2 sm:p-3 overflow-hidden">
                            <p className="text-[9px] sm:text-[10px] font-semibold uppercase tracking-wide text-neutral-500">
                              {t.blankPage}
                            </p>
                            <p className="mt-1 text-[10px] sm:text-xs leading-4 whitespace-pre-wrap overflow-hidden">
                              {page.text.trim() ? page.text : t.blankPagePreview}
                            </p>
                          </div>
                        )}
                      </div>
                      {/* Desktop: hover to show delete */}
                      <button
                        onClick={() => removePage(index)}
                        className="absolute top-1.5 end-1.5 sm:top-2 sm:end-2 bg-destructive text-destructive-foreground rounded-full p-1 sm:p-1.5 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity"
                        aria-label={t.removePage}
                      >
                        <X weight="bold" size={14} />
                      </button>
                      {/* Mobile: reorder buttons */}
                      <div className="absolute top-1.5 start-1.5 flex flex-col gap-1 sm:hidden">
                        {index > 0 && (
                          <button
                            onClick={() => movePage(index, "up")}
                            className="bg-background/90 backdrop-blur-sm text-foreground rounded p-1 border border-border"
                            aria-label={t.moveUp}
                          >
                            <ArrowUp weight="bold" size={14} />
                          </button>
                        )}
                        {index < pages.length - 1 && (
                          <button
                            onClick={() => movePage(index, "down")}
                            className="bg-background/90 backdrop-blur-sm text-foreground rounded p-1 border border-border"
                            aria-label={t.moveDown}
                          >
                            <ArrowDown weight="bold" size={14} />
                          </button>
                        )}
                      </div>
                      <div className="absolute bottom-1.5 start-1.5 sm:bottom-2 sm:start-2 bg-background/80 backdrop-blur-sm rounded px-1.5 py-0.5 sm:px-2 sm:py-1 text-[10px] sm:text-xs font-medium">
                        {t.page} {index + 1}
                      </div>
                    </div>
                  ))}
                </div>

                {blankPages.length > 0 && (
                  <div className="space-y-3 pt-1">
                    <p className="text-sm font-medium">{t.writeOnBlankPages}</p>
                    <div className="space-y-3">
                      {blankPages.map(({ page, index }, blankPageIndex) => (
                        <Field key={page.id}>
                          <FieldLabel htmlFor={`blank-page-${page.id}`}>
                            {t.blankPage} {blankPageIndex + 1} ({t.page} {index + 1})
                          </FieldLabel>
                          <Textarea
                            id={`blank-page-${page.id}`}
                            value={page.text}
                            onChange={(e) =>
                              updateBlankPageText(index, e.target.value)
                            }
                            placeholder={t.blankPagePlaceholder}
                            className="min-h-24 resize-y"
                          />
                        </Field>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {pages.length === 0 && (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-border rounded-lg p-8 sm:p-12 text-center cursor-pointer hover:border-primary active:border-primary transition-colors"
              >
                <UploadSimple
                  size={40}
                  className="mx-auto mb-3 sm:mb-4 text-muted-foreground"
                />
                <p className="text-base sm:text-lg font-medium text-foreground mb-1">
                  {t.tapToUpload}
                </p>
                <p className="text-xs sm:text-sm text-muted-foreground">
                  {t.dragAndDrop}
                </p>
                <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                  {t.orAddBlankPage}
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
                {t.pdfPreview}
              </h2>
              <div className="flex gap-2">
                <Button
                  onClick={downloadPdf}
                  className="gap-2 flex-1 sm:flex-none"
                  size="default"
                  disabled={isBusy}
                >
                  {isDownloading ? (
                    <CircleNotch weight="bold" className="animate-spin" />
                  ) : (
                    <DownloadSimple weight="bold" />
                  )}
                  {isDownloading ? t.preparingDownload : t.download}
                </Button>
                <Button
                  onClick={closePreview}
                  variant="outline"
                  className="gap-2 flex-1 sm:flex-none"
                  size="default"
                >
                  <X weight="bold" />
                  {t.close}
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
