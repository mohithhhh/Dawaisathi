"use client";

import { useState, useRef, useCallback } from "react";

interface ImageUploadProps {
  onImageSelect: (base64: string, mediaType: string) => void;
  onClear: () => void;
  hasImage: boolean;
  isLoading?: boolean;
}

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_DIM = 1600; // max px on longest side — enough for Gemini OCR

// Sharpening kernel: enhances edges so text on packaging is crisper
function applySharpening(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const imageData = ctx.getImageData(0, 0, w, h);
  const src = imageData.data;
  const out = new Uint8ClampedArray(src);
  const k = [-1, -1, -1, -1, 9, -1, -1, -1, -1]; // standard sharpen kernel

  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      for (let c = 0; c < 3; c++) {
        let sum = 0;
        for (let ky = -1; ky <= 1; ky++) {
          for (let kx = -1; kx <= 1; kx++) {
            sum += src[((y + ky) * w + (x + kx)) * 4 + c] * k[(ky + 1) * 3 + (kx + 1)];
          }
        }
        out[(y * w + x) * 4 + c] = Math.max(0, Math.min(255, sum));
      }
    }
  }
  imageData.data.set(out);
  ctx.putImageData(imageData, 0, 0);
}

// Preprocess: EXIF-correct rotation (browser handles via img.src),
// resize to max 1600px, boost contrast, sharpen text edges
async function preprocessImage(file: File): Promise<{ base64: string; dataUrl: string }> {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const img = new Image();

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);

      let { naturalWidth: w, naturalHeight: h } = img;

      // Resize so longest side ≤ MAX_DIM
      if (w > MAX_DIM || h > MAX_DIM) {
        const scale = MAX_DIM / Math.max(w, h);
        w = Math.round(w * scale);
        h = Math.round(h * scale);
      }

      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d")!;

      // Contrast + brightness boost — makes text on wrappers stand out
      ctx.filter = "contrast(1.45) brightness(1.08) saturate(0.7)";
      ctx.drawImage(img, 0, 0, w, h);
      ctx.filter = "none";

      // Sharpen edges for crisper text
      applySharpening(ctx, w, h);

      const dataUrl = canvas.toDataURL("image/jpeg", 0.93);
      resolve({ base64: dataUrl.split(",")[1], dataUrl });
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Failed to load image"));
    };

    // Setting src triggers EXIF orientation correction in modern browsers
    img.src = objectUrl;
  });
}

export default function ImageUpload({
  onImageSelect,
  onClear,
  hasImage,
  isLoading,
}: ImageUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [preprocessing, setPreprocessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processFile = useCallback(
    async (file: File) => {
      setError("");

      if (!ACCEPTED_TYPES.includes(file.type)) {
        setError("Please upload a JPG, PNG, or WebP image");
        return;
      }

      if (file.size > MAX_FILE_SIZE) {
        setError("Image must be smaller than 5MB");
        return;
      }

      setPreprocessing(true);
      try {
        const { base64, dataUrl } = await preprocessImage(file);
        setPreview(dataUrl);
        onImageSelect(base64, "image/jpeg");
      } catch {
        setError("Failed to process image. Please try another photo.");
      } finally {
        setPreprocessing(false);
      }
    },
    [onImageSelect]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) void processFile(file);
    },
    [processFile]
  );

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => setIsDragging(false);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) void processFile(file);
  };

  const handleClear = () => {
    setPreview(null);
    setError("");
    if (fileInputRef.current) fileInputRef.current.value = "";
    onClear();
  };

  if (preview && hasImage) {
    return (
      <div className="relative rounded-xl overflow-hidden border border-accent/30 bg-surface-2">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={preview}
          alt="Medicine preview"
          className="w-full h-36 object-contain bg-surface-2"
        />
        {isLoading && (
          <div className="absolute inset-0 bg-background/70 flex items-center justify-center">
            <div className="flex flex-col items-center gap-2">
              <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" />
              <span className="text-accent text-xs">Reading image...</span>
            </div>
          </div>
        )}
        <button
          onClick={handleClear}
          className="absolute top-2 right-2 bg-background/80 hover:bg-background text-text-secondary hover:text-danger rounded-full w-7 h-7 flex items-center justify-center text-sm transition-all border border-border"
          title="Remove image"
        >
          ✕
        </button>
        <div className="px-3 py-2 bg-surface border-t border-border">
          <p className="text-accent text-xs font-medium">
            📷 Image uploaded — medicine name will be extracted automatically
          </p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => !preprocessing && fileInputRef.current?.click()}
        className={`
          relative border-2 border-dashed rounded-xl p-6 transition-all
          flex flex-col items-center justify-center gap-2 min-h-[120px]
          ${preprocessing ? "cursor-wait opacity-70" : "cursor-pointer"}
          ${
            isDragging
              ? "border-accent bg-accent-glow scale-[1.01]"
              : "border-border hover:border-accent/50 hover:bg-surface-2"
          }
        `}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={handleFileInput}
          className="hidden"
          disabled={preprocessing}
        />

        {preprocessing ? (
          <>
            <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" />
            <p className="text-accent text-xs font-medium">Enhancing image...</p>
          </>
        ) : (
          <>
            <div className="text-3xl">📷</div>
            <div className="text-center">
              <p className="text-text-secondary text-sm font-medium">
                {isDragging ? "Drop image here" : "Upload medicine photo"}
              </p>
              <p className="text-muted text-xs mt-1">
                Drag & drop or click • JPG/PNG/WebP • Max 5MB
              </p>
            </div>
          </>
        )}
      </div>

      {error && (
        <p className="text-danger text-xs mt-2 bg-danger/10 rounded-lg px-3 py-2">
          ⚠ {error}
        </p>
      )}
    </div>
  );
}
