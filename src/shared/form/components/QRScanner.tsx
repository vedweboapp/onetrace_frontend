"use client";

import React from "react";
import { QrCode, Camera, Upload, X, Trash2, CheckCircle2, AlertCircle, SwitchCamera } from "lucide-react";
import { cn } from "@/core/utils/http.util";
import { AppButton } from "@/shared/ui";
import jsQR from "jsqr";

export interface QRScannerProps {
  name?: string;
  label?: React.ReactNode;
  value?: string | null;
  onChange?: (value: string | null) => void;
  errors?: { message?: string };
  readOnly?: boolean;
  disabled?: boolean;
  placeholder?: string;
}

// ─── ZXing lazy loader ───────────────────────────────────────────────────────
// We dynamic-import ZXing so it never runs during SSR
type ZXingModule = typeof import("@zxing/library");
let zxingCache: ZXingModule | null = null;

async function getZXing(): Promise<ZXingModule> {
  if (zxingCache) return zxingCache;
  zxingCache = await import("@zxing/library");
  return zxingCache;
}

// Helper: scan a canvas with jsQR across normal and inverted modes
function scanCanvasWithJsQR(canvas: HTMLCanvasElement): string | null {
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return null;
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const code = jsQR(imageData.data, canvas.width, canvas.height, {
    inversionAttempts: "attemptBoth",
  });
  return code?.data ?? null;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
function readFileAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

async function decodeQRFromImageSrc(src: string): Promise<string> {
  const img = new Image();
  img.crossOrigin = "anonymous";

  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = () => reject(new Error("Failed to load image"));
    img.src = src;
  });

  const origWidth = img.naturalWidth || img.width;
  const origHeight = img.naturalHeight || img.height;
  if (!origWidth || !origHeight) {
    throw new Error("Invalid image dimensions");
  }

  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("Canvas 2D not available");

  // Strategy 1: jsQR at multiple scales (native, 800px, 600px, 480px)
  // Scaling down removes high-frequency screen moire patterns from photographed displays
  const targetWidths = [origWidth, 800, 600, 480].filter(
    (w, idx, arr) => w <= origWidth && arr.indexOf(w) === idx,
  );

  for (const targetW of targetWidths) {
    const targetH = Math.round((origHeight / origWidth) * targetW);
    canvas.width = targetW;
    canvas.height = targetH;
    ctx.drawImage(img, 0, 0, targetW, targetH);

    const found = scanCanvasWithJsQR(canvas);
    if (found) return found;
  }

  // Strategy 2: ZXing BrowserQRCodeReader directly on the image element
  try {
    const zxing = await getZXing();
    const qrReader = new zxing.BrowserQRCodeReader();
    const result = await qrReader.decodeFromImageElement(img);
    if (result && result.getText()) {
      return result.getText();
    }
  } catch {
    // continue to next fallback
  }

  // Strategy 3: ZXing HTMLCanvasElementLuminanceSource with MultiFormatReader
  try {
    const zxing = await getZXing();
    canvas.width = origWidth;
    canvas.height = origHeight;
    ctx.drawImage(img, 0, 0);

    const lumSource = new zxing.HTMLCanvasElementLuminanceSource(canvas, false);
    const bitmap = new zxing.BinaryBitmap(new zxing.HybridBinarizer(lumSource));
    const reader = new zxing.MultiFormatReader();
    const result = reader.decode(bitmap);
    if (result && result.getText()) {
      return result.getText();
    }
  } catch {
    // continue to next fallback
  }

  // Strategy 4: ZXing with auto-inversion
  try {
    const zxing = await getZXing();
    const lumSource = new zxing.HTMLCanvasElementLuminanceSource(canvas, true);
    const bitmap = new zxing.BinaryBitmap(new zxing.HybridBinarizer(lumSource));
    const reader = new zxing.MultiFormatReader();
    const result = reader.decode(bitmap);
    if (result && result.getText()) {
      return result.getText();
    }
  } catch {
    // continue
  }

  throw new Error("No QR code found in the image. Please try another image.");
}

// ─── Component ───────────────────────────────────────────────────────────────
const QRScanner: React.FC<QRScannerProps> = ({
  name,
  label,
  value,
  onChange,
  errors,
  readOnly = false,
  disabled = false,
  placeholder = "No QR code scanned yet",
}) => {
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const streamRef = React.useRef<MediaStream | null>(null);
  const animFrameRef = React.useRef<number | null>(null);
  const isScanningRef = React.useRef<boolean>(false);

  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [activeTab, setActiveTab] = React.useState<"camera" | "upload">("camera");

  // Camera state
  const [cameraReady, setCameraReady] = React.useState(false);
  const [cameraError, setCameraError] = React.useState<string | null>(null);
  const [facingMode, setFacingMode] = React.useState<"user" | "environment">("environment");
  const [hasMultipleCameras, setHasMultipleCameras] = React.useState(false);
  const [scanning, setScanning] = React.useState(false);

  // Upload state
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [uploadError, setUploadError] = React.useState<string | null>(null);
  const [uploading, setUploading] = React.useState(false);
  const [uploadPreview, setUploadPreview] = React.useState<string | null>(null);

  // Stop everything when closing - fully robust and exception-free
  const stopCamera = React.useCallback(() => {
    isScanningRef.current = false;
    if (animFrameRef.current !== null) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (streamRef.current) {
      try {
        streamRef.current.getTracks().forEach((t) => t.stop());
      } catch {}
      streamRef.current = null;
    }
    if (videoRef.current) {
      try {
        videoRef.current.pause();
        videoRef.current.srcObject = null;
      } catch {}
    }
    setCameraReady(false);
    setScanning(false);
  }, []);

  const closeDialog = React.useCallback(() => {
    stopCamera();
    setDialogOpen(false);
    setCameraError(null);
    setUploadError(null);
    setUploadPreview(null);
    setUploading(false);
  }, [stopCamera]);

  // Start camera + multi-scale real-time scan
  const startCamera = React.useCallback(
    async (mode: "user" | "environment") => {
      stopCamera();
      setCameraError(null);
      setCameraReady(false);

      if (!navigator?.mediaDevices?.getUserMedia) {
        setCameraError("Camera not available. Use HTTPS or localhost.");
        return;
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: mode },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
        });
        streamRef.current = stream;

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.muted = true;
          videoRef.current.setAttribute("playsinline", "true");
          await videoRef.current.play().catch(() => {});
        }

        // Check for multiple cameras
        try {
          const devices = await navigator.mediaDevices.enumerateDevices();
          setHasMultipleCameras(
            devices.filter((d) => d.kind === "videoinput").length > 1,
          );
        } catch {
          // ignore
        }

        setCameraReady(true);
        setScanning(true);
        isScanningRef.current = true;

        // Frame scanner: throttled to run every ~75ms
        // Scales video down to max 640px to eliminate moire patterns from computer screens
        const offscreenCanvas = document.createElement("canvas");
        const offscreenCtx = offscreenCanvas.getContext("2d", { willReadFrequently: true });
        let lastScanTime = 0;
        let tickCount = 0;

        const scanFrame = async (timestamp: number) => {
          if (!isScanningRef.current) return;

          if (timestamp - lastScanTime >= 75) {
            lastScanTime = timestamp;
            tickCount++;
            const video = videoRef.current;

            if (video && video.readyState >= 2 && offscreenCtx) {
              const vWidth = video.videoWidth;
              const vHeight = video.videoHeight;

              if (vWidth > 0 && vHeight > 0) {
                // Optimal target size for QR detection (max 640px)
                const targetW = Math.min(640, vWidth);
                const targetH = Math.round((vHeight / vWidth) * targetW);

                if (offscreenCanvas.width !== targetW || offscreenCanvas.height !== targetH) {
                  offscreenCanvas.width = targetW;
                  offscreenCanvas.height = targetH;
                }

                offscreenCtx.drawImage(video, 0, 0, targetW, targetH);
                const imgData = offscreenCtx.getImageData(0, 0, targetW, targetH);

                // Strategy 1: Full scaled frame with jsQR
                let code = jsQR(imgData.data, targetW, targetH, {
                  inversionAttempts: "attemptBoth",
                });

                // Strategy 2: Center crop (viewfinder focus zone)
                if (!code) {
                  const cropW = Math.round(targetW * 0.65);
                  const cropH = Math.round(targetH * 0.65);
                  const startX = Math.round((targetW - cropW) / 2);
                  const startY = Math.round((targetH - cropH) / 2);
                  const cropData = offscreenCtx.getImageData(startX, startY, cropW, cropH);
                  code = jsQR(cropData.data, cropW, cropH, {
                    inversionAttempts: "attemptBoth",
                  });
                }

                // Strategy 3: Secondary check with ZXing every 4th tick (~300ms)
                if (!code && tickCount % 4 === 0) {
                  try {
                    const zxing = await getZXing();
                    const lumSource = new zxing.HTMLCanvasElementLuminanceSource(offscreenCanvas, false);
                    const bitmap = new zxing.BinaryBitmap(new zxing.HybridBinarizer(lumSource));
                    const reader = new zxing.MultiFormatReader();
                    const zxResult = reader.decode(bitmap);
                    if (zxResult && zxResult.getText()) {
                      isScanningRef.current = false;
                      onChange?.(zxResult.getText());
                      closeDialog();
                      return;
                    }
                  } catch {
                    // not detected this tick
                  }
                }

                if (code && code.data) {
                  isScanningRef.current = false;
                  onChange?.(code.data);
                  closeDialog();
                  return;
                }
              }
            }
          }

          if (isScanningRef.current) {
            animFrameRef.current = requestAnimationFrame(scanFrame);
          }
        };

        animFrameRef.current = requestAnimationFrame(scanFrame);
      } catch {
        setCameraError("Camera permission denied or unavailable.");
      }
    },
    [stopCamera, onChange, closeDialog],
  );

  // Open dialog
  const openDialog = () => {
    if (readOnly || disabled) return;
    setActiveTab("camera");
    setDialogOpen(true);
    setCameraError(null);
    setUploadError(null);
    setUploadPreview(null);
    setTimeout(() => startCamera("environment"), 150);
  };

  // Switch camera
  const switchCamera = () => {
    const next = facingMode === "environment" ? "user" : "environment";
    setFacingMode(next);
    startCamera(next);
  };

  // Tab switch
  const switchTab = (tab: "camera" | "upload") => {
    setActiveTab(tab);
    if (tab === "camera") {
      setUploadError(null);
      setUploadPreview(null);
      setTimeout(() => startCamera(facingMode), 100);
    } else {
      stopCamera();
    }
  };

  // Image upload scan
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadError(null);
    setUploading(true);

    try {
      const src = await readFileAsDataURL(file);
      setUploadPreview(src);
      const text = await decodeQRFromImageSrc(src);
      onChange?.(text);
      closeDialog();
    } catch {
      setUploadError("No QR code found in the image. Please try another image.");
    } finally {
      setUploading(false);
      // Reset file input so same file can be re-selected
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // Cleanup on unmount
  React.useEffect(() => {
    return () => {
      stopCamera();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isInteractive = !readOnly && !disabled;

  return (
    <div className="qr-scanner-root flex flex-col gap-1 w-full min-w-0 max-w-full">
      {label && (
        <label className="text-sm font-medium text-mutedtext">{label}</label>
      )}

      {/* Value display row */}
      <div
        className={cn(
          "flex flex-wrap sm:flex-nowrap items-center gap-2 sm:gap-3 rounded-[8px] px-3 py-2 min-h-[44px] w-full min-w-0 max-w-full",
          readOnly || disabled
            ? "border-none bg-transparent dark:bg-slate-700/20"
            : "border border-gray-300 bg-slate-50 dark:border-slate-700 dark:bg-slate-900/20",
        )}
      >
        <QrCode className="size-4 shrink-0 text-slate-400" />

        {value ? (
          <span className="flex-1 truncate text-sm font-medium text-slate-800 dark:text-slate-100 min-w-0 break-all">
            {value}
          </span>
        ) : (
          <span className="flex-1 truncate text-sm text-slate-400 min-w-0">
            {placeholder}
          </span>
        )}

        {isInteractive && (
          <div className="flex items-center gap-1.5 shrink-0 ml-auto">
            <AppButton
              variant="primary"
              size="sm"
              className="rounded-lg text-xs whitespace-nowrap"
              onClick={openDialog}
              type="button"
            >
              <QrCode className="size-3.5" />
              {value ? "Re-scan" : "Scan QR"}
            </AppButton>
            {value && (
              <button
                type="button"
                onClick={() => onChange?.(null)}
                className="flex items-center justify-center rounded-md border border-red-200 bg-red-50 p-1 text-red-500 transition hover:bg-red-100 h-[28px] w-[28px]"
                title="Clear scanned value"
              >
                <Trash2 className="size-3.5" />
              </button>
            )}
          </div>
        )}
      </div>

      {errors?.message && (
        <p className="text-[12px] text-red-500">{errors.message}</p>
      )}

      {/* ── Scanner Dialog ── */}
      {dialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={closeDialog}
          />

          {/* Dialog panel */}
          <div className="relative z-10 flex w-full max-w-lg flex-col gap-0 rounded-2xl bg-white shadow-2xl dark:bg-slate-900 overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <QrCode className="size-5 text-slate-700 dark:text-slate-200" />
                <h2 className="text-base font-semibold text-slate-800 dark:text-slate-100">
                  Scan QR Code
                </h2>
              </div>
              <button
                type="button"
                onClick={closeDialog}
                className="rounded-lg p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800"
              >
                <X className="size-5" />
              </button>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-gray-100 dark:border-slate-800">
              {(["camera", "upload"] as const).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => switchTab(tab)}
                  className={cn(
                    "flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium transition-colors",
                    activeTab === tab
                      ? "text-blue-600 border-b-2 border-blue-600 dark:text-blue-400 dark:border-blue-400"
                      : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200",
                  )}
                >
                  {tab === "camera" ? (
                    <>
                      <Camera className="size-4" /> Use Camera
                    </>
                  ) : (
                    <>
                      <Upload className="size-4" /> Upload Image
                    </>
                  )}
                </button>
              ))}
            </div>

            {/* Tab content */}
            <div className="p-5">
              {/* ─── Camera Tab ─── */}
              {activeTab === "camera" && (
                <div className="flex flex-col gap-3">
                  <div className="relative overflow-hidden rounded-xl bg-slate-900 aspect-video w-full">
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      muted
                      className="h-full w-full object-cover"
                    />

                    {/* Scan overlay */}
                    {cameraReady && !cameraError && (
                      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                        <div className="relative h-48 w-48">
                          {/* Corner brackets */}
                          {[
                            "top-0 left-0 border-t-4 border-l-4 rounded-tl-lg",
                            "top-0 right-0 border-t-4 border-r-4 rounded-tr-lg",
                            "bottom-0 left-0 border-b-4 border-l-4 rounded-bl-lg",
                            "bottom-0 right-0 border-b-4 border-r-4 rounded-br-lg",
                          ].map((cls, i) => (
                            <span
                              key={i}
                              className={cn(
                                "absolute h-8 w-8 border-white/90",
                                cls,
                              )}
                            />
                          ))}
                          {/* Scan line animation */}
                          <span className="absolute left-2 right-2 h-0.5 bg-blue-400/80 animate-[scan-line_2s_ease-in-out_infinite]" />
                        </div>
                      </div>
                    )}

                    {/* Camera error overlay */}
                    {cameraError && (
                      <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-slate-900/95 px-6 text-center">
                        <AlertCircle className="size-10 text-red-400" />
                        <p className="text-sm text-red-400">{cameraError}</p>
                      </div>
                    )}

                    {/* Loading overlay */}
                    {!cameraReady && !cameraError && (
                      <div className="absolute inset-0 flex items-center justify-center bg-slate-900">
                        <div className="size-8 rounded-full border-2 border-blue-400 border-t-transparent animate-spin" />
                      </div>
                    )}

                    {/* Switch camera button */}
                    {cameraReady && hasMultipleCameras && (
                      <button
                        type="button"
                        onClick={switchCamera}
                        className="absolute bottom-3 right-3 flex items-center justify-center rounded-full bg-black/60 hover:bg-black/80 text-white p-2.5 transition backdrop-blur-sm"
                        title="Switch Camera"
                      >
                        <SwitchCamera className="size-4" />
                      </button>
                    )}
                  </div>

                  {scanning && !cameraError && (
                    <p className="text-center text-xs text-slate-500 dark:text-slate-400">
                      Point your camera at a QR code to scan automatically
                    </p>
                  )}
                </div>
              )}

              {/* ─── Upload Tab ─── */}
              {activeTab === "upload" && (
                <div className="flex flex-col gap-4">
                  {/* Drop zone */}
                  <label
                    className={cn(
                      "flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed px-6 py-10 cursor-pointer transition-colors",
                      uploading
                        ? "border-blue-300 bg-blue-50/50 dark:border-blue-800 dark:bg-blue-900/20"
                        : "border-gray-300 bg-gray-50 hover:border-blue-400 hover:bg-blue-50/30 dark:border-slate-700 dark:bg-slate-800/50 dark:hover:border-blue-600",
                    )}
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleFileUpload}
                      disabled={uploading}
                    />

                    {uploading ? (
                      <>
                        <div className="size-10 rounded-full border-2 border-blue-400 border-t-transparent animate-spin" />
                        <p className="text-sm text-slate-500 dark:text-slate-400">
                          Scanning image for QR code…
                        </p>
                      </>
                    ) : (
                      <>
                        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/40">
                          <Upload className="size-6 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div className="text-center">
                          <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
                            Click to upload an image
                          </p>
                          <p className="mt-1 text-xs text-slate-400">
                            PNG, JPG, WEBP, GIF — image must contain a QR code
                          </p>
                        </div>
                      </>
                    )}
                  </label>

                  {/* Preview + error */}
                  {uploadPreview && !uploading && (
                    <div className="relative overflow-hidden rounded-lg border border-gray-200 dark:border-slate-700">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={uploadPreview}
                        alt="QR source"
                        className="max-h-48 w-full object-contain"
                      />
                    </div>
                  )}

                  {uploadError && (
                    <div className="flex items-start gap-2 rounded-lg bg-red-50 dark:bg-red-900/20 p-3 text-sm text-red-600 dark:text-red-400">
                      <AlertCircle className="size-4 mt-0.5 shrink-0" />
                      <span>{uploadError}</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex justify-end gap-2 px-5 py-4 border-t border-gray-100 dark:border-slate-800">
              <button
                type="button"
                onClick={closeDialog}
                className="rounded-lg border border-slate-200 dark:border-slate-700 px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 transition hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Scan line keyframe — injected once */}
      <style>{`
        @keyframes scan-line {
          0%   { top: 8px; opacity: 1; }
          50%  { top: calc(100% - 8px); opacity: 1; }
          100% { top: 8px; opacity: 1; }
        }
      `}</style>
    </div>
  );
};

export default QRScanner;
