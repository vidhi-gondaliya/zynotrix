"use client";
import { useEffect } from "react";
import { X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  size?: "sm" | "md" | "lg" | "xl";
}

export function Modal({ open, onClose, title, children, size = "md" }: ModalProps) {
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    if (open) document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, onClose]);

  const sizes = { sm: "max-w-sm", md: "max-w-lg", lg: "max-w-2xl", xl: "max-w-4xl" };

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 backdrop-blur-md"
            style={{ background: "rgba(0,0,0,0.65)" }}
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.93, y: 12 }}
            animate={{ opacity: 1, scale: 1,    y: 0  }}
            exit={{ opacity: 0,  scale: 0.93, y: 12  }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className={`relative w-full ${sizes[size]} panel overflow-hidden`}>

            {title && (
              <div className="flex items-center justify-between px-6 py-4"
                   style={{ borderBottom: "1px solid var(--border)" }}>
                <h2 className="text-sm font-bold text-foreground tracking-tight">{title}</h2>
                <button onClick={onClose}
                  className="w-7 h-7 rounded-xl flex items-center justify-center text-muted hover:text-foreground hover:bg-card-hover transition-all">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
            {!title && (
              <button onClick={onClose}
                className="absolute right-4 top-4 z-10 w-7 h-7 rounded-xl flex items-center justify-center text-muted hover:text-foreground hover:bg-card-hover transition-all">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
            <div className="overflow-y-auto max-h-[85vh]">{children}</div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
