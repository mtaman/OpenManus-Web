"use client";

import React, { useState, useCallback, useRef } from "react";
import { AlertTriangle, Trash2, Info, X } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface ConfirmOptions {
  title: string;
  description?: string;
  confirmText?: string;
  cancelText?: string;
  variant?: "danger" | "warning" | "info";
}

export function useConfirmModal() {
  const [modalState, setModalState] = useState<{
    isOpen: boolean;
    title: string;
    description?: string;
    confirmText: string;
    cancelText: string;
    variant: "danger" | "warning" | "info";
  } | null>(null);

  const resolverRef = useRef<(value: boolean) => void>(() => {});

  const confirm = useCallback((options: ConfirmOptions): Promise<boolean> => {
    return new Promise<boolean>((resolve) => {
      resolverRef.current = resolve;
      setModalState({
        isOpen: true,
        title: options.title,
        description: options.description,
        confirmText: options.confirmText || "Confirm",
        cancelText: options.cancelText || "Cancel",
        variant: options.variant || "danger"
      });
    });
  }, []);

  const handleConfirm = () => {
    resolverRef.current(true);
    setModalState(null);
  };

  const handleCancel = () => {
    resolverRef.current(false);
    setModalState(null);
  };

  const ConfirmDialog = () => {
    if (!modalState || !modalState.isOpen) return null;

    const getVariantStyles = () => {
      switch (modalState.variant) {
        case "warning":
          return {
            icon: <AlertTriangle className="h-5 w-5 text-amber-500" />,
            bg: "bg-amber-500/10 border-amber-500/25",
            btn: "bg-amber-600 hover:bg-amber-700 text-white"
          };
        case "info":
          return {
            icon: <Info className="h-5 w-5 text-sky-500" />,
            bg: "bg-sky-500/10 border-sky-500/25",
            btn: "bg-sky-600 hover:bg-sky-700 text-white"
          };
        case "danger":
        default:
          return {
            icon: <Trash2 className="h-5 w-5 text-rose-500" />,
            bg: "bg-rose-500/10 border-rose-500/25",
            btn: "bg-destructive hover:bg-destructive/90 text-destructive-foreground"
          };
      }
    };

    const v = getVariantStyles();

    return (
      <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-150">
        <div className="w-full max-w-md bg-card border border-border rounded-2xl p-5 shadow-2xl space-y-4 animate-in zoom-in-95 duration-150">
          <div className="flex items-start gap-3.5">
            <div className={`p-2.5 rounded-xl border ${v.bg} shrink-0`}>
              {v.icon}
            </div>
            <div className="flex-1 min-w-0 pr-2">
              <h3 className="text-sm font-bold text-foreground font-heading">{modalState.title}</h3>
              {modalState.description && (
                <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">{modalState.description}</p>
              )}
            </div>
            <button
              type="button"
              onClick={handleCancel}
              className="text-muted-foreground hover:text-foreground p-1 rounded-sm cursor-pointer transition"
            >
              <X size={15} />
            </button>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/60">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleCancel}
              className="text-xs h-8 px-3 cursor-pointer"
            >
              {modalState.cancelText}
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleConfirm}
              className={`text-xs h-8 px-3.5 cursor-pointer ${v.btn}`}
            >
              {modalState.confirmText}
            </Button>
          </div>
        </div>
      </div>
    );
  };

  return { confirm, ConfirmDialog };
}