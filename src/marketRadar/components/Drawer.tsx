/**
 * Generic sliding drawer that appears on either left or right side with a focus trap.
 */
import React, { useEffect, useRef } from "react";
import clsx from "clsx";

type DrawerProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  side?: "right" | "left";
  children: React.ReactNode;
};

const Drawer: React.FC<DrawerProps> = ({ open, onClose, title, side = "right", children }) => {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) {
      return undefined;
    }
    const focusable = panelRef.current?.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    focusable?.[0]?.focus();

    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
      if (event.key === "Tab" && focusable && focusable.length > 0) {
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };

    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [open, onClose]);

  return (
    <div
      className={clsx(
        "fixed inset-0 z-40 flex transition",
        open ? "pointer-events-auto" : "pointer-events-none"
      )}
      aria-hidden={!open}
    >
      <button
        className={clsx(
          "flex-1 bg-slate-900/40 transition-opacity",
          open ? "opacity-100" : "opacity-0"
        )}
        onClick={onClose}
        aria-label="Close drawer backdrop"
      />
      <div
        ref={panelRef}
        className={clsx(
          "card flex h-full w-full max-w-md flex-col gap-4 overflow-y-auto border border-slate-800 p-6 text-slate-100 transition-transform",
          side === "right" ? "ml-auto" : "mr-auto",
          open ? "translate-x-0" : side === "right" ? "translate-x-full" : "-translate-x-full"
        )}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-xl font-semibold text-white">{title}</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="focus-outline rounded-full bg-slate-800 px-3 py-1 text-sm font-semibold text-slate-200 hover:bg-slate-700"
          >
            Close
          </button>
        </div>
        <div className="pb-4">{children}</div>
      </div>
    </div>
  );
};

export default Drawer;
