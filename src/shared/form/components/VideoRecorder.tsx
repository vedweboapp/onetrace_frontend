"use client";

import React from "react";
import { Video, StopCircle, Camera, Trash2, Play, X, FileVideo, SwitchCamera } from "lucide-react";

export interface VideoRecorderProps {
  name?: string;
  label?: React.ReactNode;
  value?: File | string | null;
  onChange?: (file: File | null) => void;
  errors?: { message?: string };
  readOnly?: boolean;
  maxSize?: number | string;
  recordingTime?: number | string;
}

function formatSeconds(s: number): string {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}

function blobToFile(blob: Blob, name: string): File {
  return new File([blob], name, { type: blob.type });
}

const VideoRecorder: React.FC<VideoRecorderProps> = ({
  name,
  label,
  value,
  onChange,
  errors,
  readOnly = false,
  maxSize = 50,
  recordingTime = 60,
}) => {
  const previewRef = React.useRef<HTMLVideoElement>(null);
  const recorderRef = React.useRef<MediaRecorder | null>(null);
  const streamRef = React.useRef<MediaStream | null>(null);
  const chunksRef = React.useRef<Blob[]>([]);
  const timerRef = React.useRef<ReturnType<typeof setInterval> | null>(null);
  const objectUrlRef = React.useRef<string | null>(null);

  const maxSizeMB = Number(maxSize) || 50;
  const maxDurationSec = Number(recordingTime) || 60;

  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [previewDialogOpen, setPreviewDialogOpen] = React.useState(false);
  const [recording, setRecording] = React.useState(false);
  const [timeLeft, setTimeLeft] = React.useState(maxDurationSec);
  const [cameraError, setCameraError] = React.useState<string | null>(null);
  const [sizeError, setSizeError] = React.useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = React.useState<string | null>(null);
  const [facingMode, setFacingMode] = React.useState<"user" | "environment">("environment");
  const [hasMultipleCameras, setHasMultipleCameras] = React.useState(true);

  // Derive the display filename from the controlled value
  const fileName = React.useMemo(() => {
    if (!value) return null;
    if (value instanceof File) return value.name;
    if (typeof value === "string") {
      try {
        return decodeURIComponent(new URL(value).pathname.split("/").pop() ?? "video");
      } catch {
        return "video";
      }
    }
    return null;
  }, [value]);

  // Effect to manage preview URL for any kind of value (File or String URL)
  React.useEffect(() => {
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }

    if (!value) {
      setPreviewUrl(null);
      return;
    }

    if (typeof value === "string") {
      setPreviewUrl(value);
      return;
    }

    if (value instanceof Blob) {
      try {
        const url = URL.createObjectURL(value);
        objectUrlRef.current = url;
        setPreviewUrl(url);
      } catch (e) {
        console.error("Failed to create object URL for video preview:", e);
      }
    } else {
      setPreviewUrl(null);
    }

    return () => {
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
        objectUrlRef.current = null;
      }
    };
  }, [value]);

  // Cleanup on unmount
  React.useEffect(() => {
    return () => {
      stopStream();
      if (timerRef.current) clearInterval(timerRef.current);
      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function stopStream() {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }

  const initCamera = async (mode: "user" | "environment") => {
    stopStream();
    setCameraError(null);

    if (!navigator?.mediaDevices?.getUserMedia) {
      setCameraError(
        "Camera API is not available. Make sure the page is served over HTTPS or localhost."
      );
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: mode } },
        audio: true,
      });
      streamRef.current = stream;
      if (previewRef.current) {
        previewRef.current.srcObject = stream;
        previewRef.current.muted = true;
        await previewRef.current.play().catch(() => { /* autoplay */ });
      }

      if (navigator.mediaDevices.enumerateDevices) {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = devices.filter((d) => d.kind === "videoinput");
        setHasMultipleCameras(videoDevices.length > 1);
      }
    } catch (err) {
      setCameraError("Camera permission denied or unavailable.");
      console.error("VideoRecorder: getUserMedia failed", err);
    }
  };

  const toggleCamera = () => {
    if (recording) return;
    const nextMode = facingMode === "environment" ? "user" : "environment";
    setFacingMode(nextMode);
    initCamera(nextMode);
  };

  const openDialog = async () => {
    if (readOnly) return;
    setCameraError(null);
    setSizeError(null);
    setFacingMode("environment");
    setDialogOpen(true);
    // Give the dialog time to mount before accessing the video element
    setTimeout(async () => {
      await initCamera("environment");
    }, 100);
  };

  const closeDialog = () => {
    stopRecording();
    stopStream();
    setDialogOpen(false);
    setRecording(false);
    setTimeLeft(maxDurationSec);
    setCameraError(null);
  };

  const startRecording = () => {
    if (!streamRef.current || recording || readOnly) return;
    chunksRef.current = [];
    setSizeError(null);

    const mimeType = MediaRecorder.isTypeSupported("video/webm;codecs=vp9")
      ? "video/webm;codecs=vp9"
      : MediaRecorder.isTypeSupported("video/webm")
      ? "video/webm"
      : "video/mp4";

    const recorder = new MediaRecorder(streamRef.current, { mimeType });
    recorderRef.current = recorder;

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };

    recorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: mimeType });
      const sizeMB = blob.size / (1024 * 1024);
      if (sizeMB > maxSizeMB) {
        setSizeError(`Recording exceeds the ${maxSizeMB} MB limit.`);
        onChange?.(null);
      } else {
        const ext = mimeType.includes("mp4") ? "mp4" : "webm";
        const file = blobToFile(blob, `${name ?? "video"}_${Date.now()}.${ext}`);
        onChange?.(file);
        // Close dialog after successful recording
        setDialogOpen(false);
        stopStream();
      }
      chunksRef.current = [];
    };

    recorder.start(250);
    setRecording(true);
    setTimeLeft(maxDurationSec);

    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) { stopRecording(); return 0; }
        return prev - 1;
      });
    }, 1000);
  };

  const stopRecording = () => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    if (recorderRef.current?.state === "recording") recorderRef.current.stop();
    setRecording(false);
  };

  const clearVideo = () => {
    if (objectUrlRef.current) { URL.revokeObjectURL(objectUrlRef.current); objectUrlRef.current = null; }
    setSizeError(null);
    onChange?.(null);
  };

  return (
    <div className="flex flex-col gap-1 w-full">
      {label && (
        <label className="text-sm font-medium text-mutedtext">
          {label}
        </label>
      )}

      {/* Compact file status row matching input heights */}
      <div className="flex items-center gap-3 rounded-[8px] border border-gray-300 bg-slate-50 px-3 py-1 min-h-[40px] w-full">
        <FileVideo className="size-4 shrink-0 text-slate-400" />
        {fileName ? (
          <button
            type="button"
            onClick={() => setPreviewDialogOpen(true)}
            className="flex-1 text-left truncate text-sm font-medium text-blue-600 hover:text-blue-700 hover:underline focus:outline-none"
            title="Click to preview video"
          >
            {fileName}
          </button>
        ) : (
          <span className="flex-1 truncate text-sm text-slate-400">
            No file added
          </span>
        )}
        {!readOnly && (
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={openDialog}
              className="inline-flex items-center gap-1 rounded-md border border-slate-300 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-100 h-[28px]"
            >
              <Camera className="size-3.5" />
              {fileName ? "Re-record" : "Open Camera"}
            </button>
            {fileName && (
              <button
                type="button"
                onClick={clearVideo}
                className="flex items-center justify-center rounded-md border border-red-200 bg-red-50 p-1 text-red-500 transition hover:bg-red-100 h-[28px] w-[28px]"
                title="Remove video"
              >
                <Trash2 className="size-3.5" />
              </button>
            )}
          </div>
        )}
      </div>

      {sizeError && <p className="text-[12px] text-red-500">{sizeError}</p>}
      {errors?.message && <p className="text-[12px] text-red-500">{errors.message}</p>}

      {/* Video Preview dialog/modal */}
      {previewDialogOpen && previewUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setPreviewDialogOpen(false)}
          />

          {/* Dialog panel */}
          <div className="relative z-10 flex w-full max-w-xl flex-col gap-4 rounded-2xl bg-white p-6 shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileVideo className="size-5 text-slate-700" />
                <h2 className="text-base font-semibold text-slate-800 truncate max-w-[350px]">
                  {fileName || "Video Preview"}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setPreviewDialogOpen(false)}
                className="rounded-lg p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
              >
                <X className="size-5" />
              </button>
            </div>

            {/* Video player container */}
            <div className="relative overflow-hidden rounded-xl bg-slate-900 aspect-video w-full flex items-center justify-center">
              <video
                src={previewUrl}
                controls
                playsInline
                preload="auto"
                className="h-full w-full object-contain"
              />
            </div>

            {/* Footer / Controls */}
            <div className="flex items-center justify-between text-xs text-slate-500">
              <a
                href={previewUrl}
                download={fileName || "video.mp4"}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline hover:text-blue-700 font-medium"
              >
                Download / Open directly
              </a>
              <button
                type="button"
                onClick={() => setPreviewDialogOpen(false)}
                className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Camera dialog/modal */}
      {dialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={closeDialog}
          />

          {/* Dialog panel */}
          <div className="relative z-10 flex w-full max-w-xl flex-col gap-4 rounded-2xl bg-white p-6 shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Video className="size-5 text-slate-700" />
                <h2 className="text-base font-semibold text-slate-800">Record Video</h2>
              </div>
              <button
                type="button"
                onClick={closeDialog}
                className="rounded-lg p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
              >
                <X className="size-5" />
              </button>
            </div>

            {/* Camera preview */}
            <div className="relative overflow-hidden rounded-xl bg-slate-900 aspect-video w-full">
              <video
                ref={previewRef}
                autoPlay
                playsInline
                muted
                className="h-full w-full object-cover"
              />
              {cameraError && (
                <div className="absolute inset-0 flex items-center justify-center bg-slate-900">
                  <p className="text-sm text-red-400 px-4 text-center">{cameraError}</p>
                </div>
              )}
              {recording && (
                <div className="absolute top-3 left-3 flex items-center gap-1.5 rounded-full bg-red-600/90 px-3 py-1 text-xs font-semibold text-white backdrop-blur-sm">
                  <span className="size-2 rounded-full bg-white animate-pulse" />
                  REC {formatSeconds(timeLeft)}
                </div>
              )}
              {!cameraError && hasMultipleCameras && (
                <button
                  type="button"
                  onClick={toggleCamera}
                  disabled={recording}
                  className="absolute bottom-3 right-3 flex items-center justify-center rounded-full bg-black/60 hover:bg-black/80 text-white p-2.5 transition disabled:opacity-40 disabled:cursor-not-allowed backdrop-blur-sm shadow-md"
                  title="Switch Camera"
                >
                  <SwitchCamera className="size-5" />
                </button>
              )}
            </div>

            {/* Controls */}
            <div className="flex items-center justify-between">
              <p className="text-[11px] text-slate-400">
                Max {maxSizeMB} MB / {formatSeconds(maxDurationSec)}
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={closeDialog}
                  className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
                >
                  Cancel
                </button>
                {!recording ? (
                  <button
                    type="button"
                    onClick={startRecording}
                    disabled={!!cameraError}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-red-700 disabled:opacity-50"
                  >
                    <Play className="size-4" /> Start Recording
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={stopRecording}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-slate-800 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-900"
                  >
                    <StopCircle className="size-4" /> Stop & Save
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VideoRecorder;