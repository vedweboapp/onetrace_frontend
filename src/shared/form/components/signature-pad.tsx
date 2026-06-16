"use client";

import React, { useRef, useState, useEffect } from "react";
import SignatureCanvas from "react-signature-canvas";
import { Trash2, RotateCcw, PenTool } from "lucide-react";
import { FieldError } from "react-hook-form";

export interface SignaturePadProps {
  label?: string | React.ReactNode;
  name: string;
  value?: string;
  onChange: (value: string) => void;
  errors?: FieldError;
  readOnly?: boolean;
  placeholder?: string;
  height?: number;
}

const SignaturePad = React.forwardRef<HTMLDivElement, SignaturePadProps>(
  (
    {
      label,
      name,
      value = "",
      onChange,
      errors,
      readOnly = false,
      placeholder = "Sign here...",
      height = 200,
    },
    ref,
  ) => {
    const sigPadRef = useRef<SignatureCanvas | null>(null);
    const containerRef = useRef<HTMLDivElement | null>(null);
    const [isEmpty, setIsEmpty] = useState(!value);

    // hasSavedSignature tracks whether we should display a read-only static image of a PREVIOUSLY SAVED signature
    const [hasSavedSignature, setHasSavedSignature] = useState(!!value);

    // Sync state when signature value changes externally (like on form resets)
    useEffect(() => {
      setIsEmpty(!value);
      if (!value) {
        setHasSavedSignature(false);
        if (sigPadRef.current) {
          sigPadRef.current.clear();
        }
      } else if (!hasSavedSignature) {
        // If it was populated externally (e.g. loaded from DB) and we're not currently editing, set saved signature
        setHasSavedSignature(true);
      }
    }, [value]);

    // Handle when drawing ends (each mouse-up / touch-end)
    const handleDrawEnd = () => {
      if (sigPadRef.current && !readOnly) {
        if (!sigPadRef.current.isEmpty()) {
          const signatureDataUrl = sigPadRef.current
            .getTrimmedCanvas()
            .toDataURL("image/png");
          onChange(signatureDataUrl);
          setIsEmpty(false);
        }
      }
    };

    // Clear the active drawing canvas
    const handleClear = (e: React.MouseEvent) => {
      e.stopPropagation();
      e.preventDefault();
      if (readOnly) return;

      if (sigPadRef.current) {
        sigPadRef.current.clear();
      }
      onChange("");
      setIsEmpty(true);
    };

    // Triggered when clicking "Clear & Sign Again" on a saved preview card
    const handleResetImage = (e: React.MouseEvent) => {
      e.stopPropagation();
      e.preventDefault();
      if (readOnly) return;

      setHasSavedSignature(false);
      onChange("");
      setIsEmpty(true);
      // Wait for React to render the canvas, then clear it
      setTimeout(() => {
        if (sigPadRef.current) {
          sigPadRef.current.clear();
        }
      }, 0);
    };

    return (
      <div
        className="flex flex-col gap-1.5 w-full"
        ref={(node) => {
          containerRef.current = node;
          if (typeof ref === "function") {
            ref(node);
          } else if (ref) {
            ref.current = node;
          }
        }}
      >
        {label && (
          <div className="flex items-center justify-between">
            {typeof label === "string" ? (
              <label className="text-[13px] font-bold text-gray-600 dark:text-gray-300 uppercase tracking-wide">
                {label}
              </label>
            ) : (
              label
            )}
          </div>
        )}

        <div className="relative w-full">
          {hasSavedSignature && value ? (
            /* Premium rendered signature image preview */
            <div
              className={`
                w-full
                border bg-gray-50 dark:bg-slate-900/50 flex flex-col items-center justify-center relative select-none overflow-hidden
                ${errors ? "border-red-500" : "border-gray-200 dark:border-slate-700  rounded-[8px] hover:border-dashed hover:border-[color:var(--dash-accent)] "}
              `}
              style={{ height }}
            >
              <img
                src={value}
                alt="Saved Signature"
                className="max-w-full max-h-[80%] object-contain"
              />

              {!readOnly && (
                <button
                  type="button"
                  onClick={handleResetImage}
                  className="absolute bottom-3 right-3 flex items-center gap-1.5 px-3 py-1.5 bg-black hover:bg-slate-900 text-white text-xs font-bold rounded-[6px] transition-all hover:scale-105 shadow-md border border-slate-800"
                >
                  <RotateCcw size={12} />
                  Clear & Sign Again
                </button>
              )}
            </div>
          ) : (
            /* Active Drawing Canvas */
            <div
              className={`
                w-full rounded-[8px] border bg-white hover:border-[color:var(--dash-accent)] dark:bg-slate-900 relative overflow-hidden transition-all duration-200
                ${readOnly ? "bg-gray-50 border-gray-100 cursor-not-allowed" : "border-dashed border-gray-300 dark:border-slate-700"}
                ${errors ? "border-red-500 ring-1 ring-red-500" : ""}
              `}
              style={{ height }}
            >
              {isEmpty && (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-400 dark:text-gray-500 pointer-events-none select-none z-0">
                  <PenTool
                    size={20}
                    className="mb-1 text-gray-300 dark:text-gray-600 animate-pulse"
                  />
                  <span className="text-xs font-medium">{placeholder}</span>
                </div>
              )}

              <SignatureCanvas
                ref={sigPadRef}
                canvasProps={{
                  className: `w-full h-full z-10 relative cursor-crosshair ${readOnly ? "pointer-events-none" : ""
                    }`,
                }}
                onEnd={handleDrawEnd}
              />

              {!isEmpty && !readOnly && (
                <button
                  type="button"
                  onClick={handleClear}
                  className="absolute bottom-3 right-3 p-1.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-md transition-colors shadow-sm border border-red-200 z-20"
                  title="Clear Signature"
                >
                  <Trash2 size={14} />
                </button>
              )}
            </div>
          )}
        </div>

        {errors && (
          <span className="text-red-500 text-xs mt-0.5 ml-0.5">
            {errors.message}
          </span>
        )}
      </div>
    );
  },
);

SignaturePad.displayName = "SignaturePad";

export default SignaturePad;
