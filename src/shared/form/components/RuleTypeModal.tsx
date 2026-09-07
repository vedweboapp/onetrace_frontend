"use client";

import React from "react";
import { AppButton as Button } from "@/shared/ui/app-button";
import { X, Play, Sliders } from "lucide-react";

interface RuleTypeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (type: "normal" | "advanced") => void;
}

export default function RuleTypeModal({ isOpen, onClose, onSelect }: RuleTypeModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-[100] animate-fade-in">
      <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl shadow-2xl w-full max-w-lg p-6 relative overflow-hidden transition-all duration-300 ">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
          aria-label="Close modal"
        >
          <X className="size-5" />
        </button>

        <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">
          Select Rule Type
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
          Choose between a standard rule or a multi-conditional advanced rule.
        </p>

        <div className="grid grid-cols-1 gap-4 mb-6">
          {/* Normal Rule Card */}
          <button
            onClick={() => onSelect("normal")}
            className="flex items-start gap-4 p-4 border border-gray-200 dark:border-slate-700 hover:border-blue-500 dark:hover:border-blue-500 rounded-lg text-left transition-all hover:bg-slate-50 dark:hover:bg-slate-800/50 group"
          >
            <div className="p-3 bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 rounded-lg group-hover:scale-110 transition-transform">
              <Play className="size-6" />
            </div>
            <div>
              <h4 className="font-semibold text-gray-900 dark:text-gray-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                Normal Rule
              </h4>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Create a simple IF/THEN rule triggered by a single field condition and applying one or more actions.
              </p>
            </div>
          </button>

          {/* Advanced Rule Card */}
          <button
            onClick={() => onSelect("advanced")}
            className="flex items-start gap-4 p-4 border border-gray-200 dark:border-slate-700 hover:border-purple-500 dark:hover:border-purple-500 rounded-lg text-left transition-all hover:bg-slate-50 dark:hover:bg-slate-800/50 group"
          >
            <div className="p-3 bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400 rounded-lg group-hover:scale-110 transition-transform">
              <Sliders className="size-6" />
            </div>
            <div>
              <h4 className="font-semibold text-gray-900 dark:text-gray-100 group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
                Advanced Rule
              </h4>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Combine multiple independent conditional rule blocks grouped under one parent rule.
              </p>
            </div>
          </button>
        </div>

        <div className="flex justify-end gap-3">
          <Button onClick={onClose} variant="secondary">
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
}
