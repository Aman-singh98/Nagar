import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { HiX } from "react-icons/hi";

export default function Modal({ open, onClose, title, subtitle, children, size = "md" }) {
   const overlayRef = useRef(null);

   // Close on Escape key
   useEffect(() => {
      if (!open) return;
      const handler = (e) => { if (e.key === "Escape") onClose(); };
      document.addEventListener("keydown", handler);
      document.body.style.overflow = "hidden";
      return () => {
         document.removeEventListener("keydown", handler);
         document.body.style.overflow = "";
      };
   }, [open, onClose]);

   if (!open) return null;

   const widths = { sm: "max-w-md", md: "max-w-xl", lg: "max-w-3xl", xl: "max-w-5xl" };

   return createPortal(
      <div
         ref={overlayRef}
         className="fixed inset-0 z-50 flex items-center justify-center p-4"
         style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(4px)" }}
         onClick={(e) => { if (e.target === overlayRef.current) onClose(); }}
      >
         <div
            className={`w-full ${widths[size]} animate-fade-up`}
            style={{
               background: "var(--surface)",
               border: "1px solid var(--border-2)",
               borderRadius: "var(--radius-lg)",
               boxShadow: "var(--shadow-lg)",
               maxHeight: "90dvh",
               display: "flex",
               flexDirection: "column",
            }}
         >
            {/* Header */}
            <div className="flex items-start justify-between p-5 border-b border-[--border]">
               <div>
                  <h2 style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "1.125rem", color: "var(--text)" }}>
                     {title}
                  </h2>
                  {subtitle && <p className="text-sm text-[--text-2] mt-0.5">{subtitle}</p>}
               </div>
               <button
                  onClick={onClose}
                  className="w-8 h-8 flex items-center justify-center rounded-[--radius] text-[--text-3] hover:text-[--text] hover:bg-[--bg-4] transition-all"
               >
                  <HiX className="w-4 h-4" />
               </button>
            </div>
            {/* Body */}
            <div className="flex-1 overflow-y-auto p-5">{children}</div>
         </div>
      </div>,
      document.body,
   );
}
